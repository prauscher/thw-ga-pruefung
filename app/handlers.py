#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json
import hashlib
import time
import traceback
from contextlib import contextmanager, suppress
from functools import partial
from pathlib import Path
from datetime import datetime
from threading import RLock
from zoneinfo import ZoneInfo

import tornado
import tornado.websocket


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")


class ReplayHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", replay=True)


def parse_timestamp(text: str):
    for format in ["%d.%m.%Y %H:%M:%S", "%d.%m.%Y %H:%M"]:
        with suppress(ValueError):
            return datetime.strptime(text, format).replace(tzinfo=ZoneInfo("Europe/Berlin"))
    raise ValueError(f"{text} does not match any format")


class BuildReplayHandler(tornado.web.RequestHandler):
    # disable xsrf protection
    def check_xsrf_cookie(self):
        pass

    def set_default_headers(self):
        self.set_header("Content-Type", "application/json")

    def _build_id(self, name):
        return hashlib.sha256(name.encode("utf-8")).hexdigest()[:4]

    def post(self):
        export_file = self.request.files["export_file"][0]

        examinees = {}
        stations = {}
        events = []

        csv_reader = csv.reader(export_file["body"].decode("utf-8").splitlines())
        header = next(csv_reader)
        for i, row_raw in enumerate(csv_reader):
            row = dict(zip(header, row_raw, strict=True))

            e_id = self._build_id(row["Prüfling"])
            examinees[e_id] = {
                "name": row["Prüfling"],
                "priority": 100,
                "flags": [],
                "locked": 0,
            }

            if row["Station"] == "Theorie":
                s_id = "_theorie"
            elif row["Station"] == "Mittagspause":
                s_id = "_pause"
            else:
                s_id = self._build_id(row["Station"])
                stations[s_id] = {
                    "name": row["Station"],
                    "name_pdf": "",
                    "tasks": [],
                }

            start = parse_timestamp(row["Start"])
            try:
                end = parse_timestamp(row["Ende"])
            except ValueError:
                end = None
            result = {"Aktiv": "open", "Abgebrochen": "canceled", "Abgeschlossen": "done",
                      }[row.get("Ergebnis", "Abgeschlossen")]

            assignment = {
                "_m": "assignment",
                "i": f"{i:04x}",
                "examinee": e_id,
                "station": s_id,
                "examiner": row.get("Prüfer"),
                "start": start.timestamp(),
                "end": end.timestamp() if s_id == "_pause" and end is not None else None,
            }

            events.append([start.timestamp(),
                          {**assignment, "result": "open"}])
            if result != "open" and end is not None:
                events.append([end.timestamp(),
                              {**assignment, "result": result, "end": end.timestamp()}])

        events.sort(key=lambda item: item[0])

        self.write(json.dumps({"state": {"examinees": examinees, "stations": stations, "examiners": {}, "assignments": []}, "events": events}))


class BroadcastState:
    snr = 0
    users = {}
    # First entry in cache is never transmitted, but needed during search of _fetch
    message_cache = [{"_snr": 0}]

    _save_lock = RLock()

    def __init__(self, storage_path: Path):
        self._storage = storage_path
        self._storage_content = ""
        if self._storage.exists():
            self._storage_content = self._storage.read_text()
            self.from_file(json.loads(self._storage_content))

        tornado.ioloop.PeriodicCallback(self.store, 1000 * 5).start()

    def iterate_cache_since(self, since_snr):
        msgs = []
        for cached_msg in reversed(self.message_cache):
            if since_snr == cached_msg["_snr"]:
                break
            msgs.append(cached_msg)
        else:
            raise IndexError

        for cached_msg in reversed(msgs):
            yield cached_msg

    def save(self):
        # should be called after every change, do not use (yet)
        pass

    def store(self):
        locked = self._save_lock.acquire(timeout=5)
        if not locked:
            print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | Failed to secure save_lock, skipping save")
            return

        try:
            new_content = json.dumps(self.to_file())

            # avoid recurring writes
            if self._storage_content == new_content:
                return

            self._storage_content = new_content
            self._storage.write_text(self._storage_content)
        finally:
            if locked:
                self._save_lock.release()

    def from_file(self, data):
        self.snr = data.get("snr", 0)
        self.users = data.get("users", {})
        self.message_cache = data.get("message_cache", [{"_snr": 0}])

    def to_file(self):
        return {"snr": self.snr,
                "users": self.users,
                "message_cache": self.message_cache}

    def to_client(self):
        return {"_snr": self.snr}


class BroadcastWebSocketHandler(tornado.websocket.WebSocketHandler):
    _clients = set()
    auth = None

    # state must be set to BroadcastState (or a subclass)
    state = None

    @property
    def current_user(self):
        if self.auth is None:
            return {"name": "Anonymous", "role": "guest"}

        return self.state.users[self.auth]

    def open(self):
        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | New Client connected")
        self.send(_server_time_message())
        self.send({"_m": "_auth_required", "first_login": not self.state.users})

    def reply(self, request, reply):
        self.send({**reply, "_cid": request.get("_cid", "")})

    def format_message(self, msg):
        return msg

    def format_state(self, state):
        return state

    def send(self, msg):
        self.write_message(json.dumps(self.format_message(msg)))

    @classmethod
    def send_to_all(cls, msg, *, include_snr = True):
        if include_snr:
            cls.state.snr = (cls.state.snr + 1) & 0xffff
            msg["_snr"] = cls.state.snr
            cls.state.message_cache = cls.state.message_cache[-1023:] + [msg]
            cls.state.save()

        for client in cls._clients:
            if client.auth is not None and client.auth in cls.state.users:
                client.send(msg)

    def broadcast(self, request, msg):
        msg["_cid"] = request.get("_cid", "")
        self.send_to_all(msg)
        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | {msg['_snr']:05d} | {self.current_user['name']:<25} | {msg['_cid']:<8} | {msg}")

    def on_close(self):
        self._clients.discard(self)

    def on_message(self, message):
        # Ignore anything after error
        if not self.ws_connection or self.ws_connection.is_closing():
            return None

        try:
            msg = json.loads(message)
            msg_type = msg.get("_m", "")

            # ignore duplicate broadcasts
            if "_cid" in msg:
                for seen_msg in self.state.message_cache:
                    if seen_msg.get("_cid", "") == msg["_cid"]:
                        self.send(seen_msg)
                        return

            # Allow all messages after login, and _login or _create_user (iff no user exists) during login
            if any([self.auth is not None,
                    msg_type == "_login",
                    msg_type == "_create_user" and not self.state.users]):
                handler = getattr(self, f"process_{msg_type}", None)
                if handler is None:
                    self.reply(msg, {"_m": "_unknown"})
                else:
                    handler(msg)
        except Exception as exception:
            traceback.print_exception(exception)
            self.close(1003, "failed to parse")

    def process__login(self, msg):
        token = msg.get("token", "")
        user = self.state.users.get(token)
        if not user:
            self.reply(msg, {"_m": "_auth_required", "message": "Authentication failed"})
            return
        self.auth = token

        self._clients.add(self)

        if msg.get("last_snr") is not None:
            # Try to only send delta to avoid huge messages
            try:
                for cached_msg in self.state.iterate_cache_since(msg["last_snr"]):
                    self.send(cached_msg)
                self.reply(msg, {"_m": "_init", "user": user})
                return
            except IndexError:
                # Message not found in cache, send full state
                pass

        # send
        state = json.dumps(self.format_state(self.state.to_client()))
        chunk_len = 256
        chunk_count = -(len(state) // -chunk_len)
        self.reply(msg, {"_m": "_init", "user": user, "chunks": chunk_count})
        for i in range(chunk_count):
            self.reply(msg, {"_m": "_state", "num": i, "c": state[i * chunk_len:(i + 1) * chunk_len]})

    def process__fetch(self, msg):
        try:
            for cached_msg in self.state.iterate_cache_since(msg["since_snr"]):
                self.send(cached_msg)
        except IndexError:
            # Could not find the message in cache, force reload
            self.reply(msg, {"_m": "_reload"})
            return

        self.reply(msg, {"_m": "_fetch_complete"})

    def process__create_user(self, msg):
        first_run = not self.state.users

        if not first_run and self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "_unauthorized"})
            return

        self.state.users[msg.get("token")] = {"name": msg.get("name"), "role": msg.get("role")}
        self.state.save()

        if first_run:
            # Special case: Login after creation of first user
            self.process__login(msg)
            return

        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} |       | {self.current_user['name']:<25} | {msg['_cid']:<8} | Created user {msg.get('name')}")
        self.reply(msg, {"_m": "_success"})

    def process_request_users(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "_unauthorized"})
            return

        self.reply(msg, {"_m": "users", "users": self.state.users})

    def process_user_delete(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "_unauthorized"})
            return

        current_user = self.current_user
        self.state.users.pop(msg["token"], "")
        self.state.save()

        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} |       | {current_user['name']:<25} | {msg['_cid']:<8} | Deleted user {msg.get('name')}")
        self.reply(msg, {"_m": "_confirm"})


class AppState(BroadcastState):
    serie_id = None
    stations = {}
    examinees = {}
    examiners = {}
    assignments = {}

    def to_client(self):
        return {**super().to_client(),
                "serie_id": self.serie_id,
                "stations": self.stations,
                "examinees": self.examinees,
                "examiners": self.examiners,
                "assignments": self.assignments}

    def to_file(self):
        return {**super().to_file(),
                "serie_id": self.serie_id,
                "stations": self.stations,
                "examinees": self.examinees,
                "examiners": self.examiners,
                "assignments": self.assignments}

    def from_file(self, data):
        super().from_file(data)
        self.serie_id = data.get("serie_id", None)
        self.stations = data.get("stations", {})
        self.examinees = data.get("examinees", {})
        self.examiners = data.get("examiners", {})
        self.assignments = data.get("assignments", {})

    def get_examiner(self, user_name):
        return self.examiners.get(
            user_name,
            {"examinee_requests": [], "station": "_"},
        )


def release_assignments():
    for assignment_id, assignment in MessageHandler.state.assignments.items():
        if assignment["end"] is None:
            continue

        if assignment["end"] > time.time():
            continue

        if assignment["result"] != "open":
            continue

        assignment["result"] = "done"
        MessageHandler.state.save()
        MessageHandler.send_to_all({"_m": "assignment", "i": assignment_id, **assignment})


def _server_time_message():
    return {"_m": "_server_timestamp", "time": time.time()}


class MessageHandler(BroadcastWebSocketHandler):
    # note that this will start reading and writing data
    state = AppState(Path("data.json"))

    cleanup_callback = tornado.ioloop.PeriodicCallback(release_assignments, 1000 * 10)
    cleanup_callback.start()

    broadcast_time_callback = tornado.ioloop.PeriodicCallback(lambda: MessageHandler.send_to_all(_server_time_message(), include_snr=False), 1000 * 10)
    broadcast_time_callback.start()

    def format_message(self, msg):
        # remove details from examiner events
        if self.current_user.get("role", "") == "examiner":
            # do not inflict with administrative messages
            if msg.get("_m", "").startswith("_"):
                return msg

            allowlist = {
                "station": ["i", "name"],
                "station_delete": ["i"],
                "examinee": ["i", "name", "flags"],
                "examinee_delete": ["i"],
                "examiner": ["name", "station", "examinee_requests"],
                "assignment": ["i", "result", "examinee", "examiner", "station", "start"],
            }

            # only show our data
            if msg.get("_m") == "examiner" and msg.get("name") != self.current_user.get("name"):
                return {"_m": "_redacted"}

            # only allow known messages
            allowed = allowlist.get(msg.get("_m"))
            if allowed is None:
                return {"_m": "_redacted"}

            # always leave administrative attributes like _m and _cid alone
            return {k: v
                    for k, v in msg.items()
                    if k.startswith("_") or k in allowed}

        return super().format_message(msg)

    def format_state(self, state):
        if self.current_user.get("role", "") == "examiner":
            user_name = self.current_user.get("name")

            def filter_dict(allowed_keys, data, entry_filter = None):
                return {i: {k: v for k, v in item.items() if k in allowed_keys}
                        for i, item in data.items()
                        if entry_filter is None or entry_filter(i, item)}

            filters = {
                "serie_id": lambda _out: None,
                "stations": partial(filter_dict, ["name"]),
                "examinees": partial(filter_dict, ["name", "flags"]),
                "examiners": lambda examiners: {k: v for k, v in examiners.items() if k == user_name},
                "assignments": partial(filter_dict, ["name", "result", "examinee", "examiner", "station", "start"]),
            }

            return {k: filters.get(k, lambda out: out)(v)
                    for k, v in state.items()}

        return super().format_state(state)

    def process_set_global_settings(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "unauthorized"})
            return

        self.state.serie_id = msg.get("serie_id");
        self.state.save()
        self.broadcast(msg, {"_m": "set_global_settings", "serie_id": self.state.serie_id})

    def process_station(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        self.state.stations[i] = {
            **self.state.stations.get(i, {}),
            "name": msg.get("name"), "name_pdf": msg.get("name_pdf"), "tasks": msg.get("tasks"),
        }
        self.state.save()
        self.broadcast(msg, {"_m": "station", "i": i, **self.state.stations[i]})

    def process_station_delete(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        self.state.assignments = {a_id: assignment
                                  for a_id, assignment in self.state.assignments.items()
                                  if assignment.get("station") != i}
        self.state.stations.pop(i, None)
        self.state.save()
        self.broadcast(msg, {"_m": "station_delete", "i": i})

    def process_examinee(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        locked = int(msg.get("locked", "0"))
        if locked > 0:
            locked = time.time() + locked * 60

        self.state.examinees[i] = {
            **self.state.examinees.get(i, {}),
            "name": msg.get("name"),
            "priority": int(msg.get("priority")),
            "flags": msg.get("flags", []),
            "locked": locked,
        }
        self.state.save()
        self.broadcast(msg, {"_m": "examinee", "i": i, **self.state.examinees[i]})

    def process_examinee_delete(self, msg):
        if self.current_user.get("role", "") != "admin":
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        self.state.assignments = {a_id: assignment
                                  for a_id, assignment in self.state.assignments.items()
                                  if assignment.get("examinee") != i}
        self.state.examinees.pop(i, None)
        self.state.save()
        self.broadcast(msg, {"_m": "examinee_delete", "i": i})

    def process_examinee_lock(self, msg):
        if self.current_user.get("role", "") != "operator":
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        locked = int(msg.get("locked", "0"))
        if locked > 0:
            locked = time.time() + locked * 60
        self.state.examinees.get(i, {}).update({"locked": locked})
        self.state.save()
        self.broadcast(msg, {"_m": "examinee", "i": i, **self.state.examinees[i]})

    def process_examinee_flags(self, msg):
        if self.current_user.get("role", "") != "operator":
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        self.state.examinees.get(i, {}).update({"flags": msg["flags"]})
        self.state.save()
        self.broadcast(msg, {"_m": "examinee", "i": i, **self.state.examinees[i]})

    def process_assign(self, msg):
        if self.current_user.get("role", "") != "operator":
            self.reply(msg, {"_m": "unauthorized"})
            return

        # Pop examinee_request
        if self.state.examiners.get(msg.get("examiner"), {}).get("examinee_requests"):
            with self._update_examiner(msg, msg.get("examiner")) as examiner:
                examiner["examinee_requests"].pop(0);

        i = msg.get("i")
        self.state.assignments[i] = {
            **self.state.assignments.get(i, {}),
            "examinee": msg.get("examinee"),
            "station": msg.get("station"),
            "examiner": msg.get("examiner", ""),
            "start": time.time(),
            "end": None if "autoEnd" not in msg else time.time() + msg["autoEnd"],
            "result": "open"}
        self.state.save()
        self.broadcast(msg, {"_m": "assignment", "i": i, **self.state.assignments[i]})

    def process_return(self, msg):
        if self.current_user.get("role", "") not in ["operator", "evaluator"]:
            self.reply(msg, {"_m": "unauthorized"})
            return

        i = msg.get("i")
        self.state.assignments.get(i, {}).update({
            "end": time.time(),
            "result": msg.get("result")})
        self.state.save()
        self.broadcast(msg, {"_m": "assignment", "i": i, **self.state.assignments[i]})

        examiner = self.state.assignments.get(i, {}).get("examiner")
        if msg.get("result") == "canceled" and examiner:
            with self._update_examiner(msg, examiner) as examiner:
                if examiner.get("station") == self.state.assignments.get(i, {}).get("station"):
                    examiner["examinee_requests"].append({"request": time.time()})

    @contextmanager
    def _update_examiner(self, msg, user_name):
        examiner = self.state.get_examiner(user_name)
        try:
            yield examiner
        finally:
            self.state.examiners[user_name] = examiner
            self.state.save()
            self.broadcast(msg, {"_m": "examiner", "name": user_name, **examiner})

    def process_examiner_station(self, msg):
        if self.current_user.get("role", "") != "examiner":
            self.reply(msg, {"_m": "unauthorized"})
            return

        station = msg.get("station")
        if msg.get("station") not in self.state.stations:
            station = "_"

        with self._update_examiner(msg, self.current_user.get("name")) as examiner:
            examiner["station"] = station

    def process_examiner_request_remove(self, msg):
        if self.current_user.get("role", "") != "operator":
            self.reply(msg, {"_m": "unauthorized"})
            return

        with self._update_examiner(msg, msg.get("name")) as examiner:
            with suppress(IndexError):
                examiner["examinee_requests"].pop()

    def process_examiner_request(self, msg):
        if self.current_user.get("role", "") != "examiner":
            self.reply(msg, {"_m": "unauthorized"})
            return

        with self._update_examiner(msg, self.current_user.get("name")) as examiner:
            examiner["examinee_requests"].append({"request": time.time()})

    def process_examiner_request_cancel(self, msg):
        if self.current_user.get("role", "") != "examiner":
            self.reply(msg, {"_m": "unauthorized"})
            return

        if not self.state.examiners.get(self.current_user.get("name"), {}).get("examinee_requests"):
            return

        with self._update_examiner(msg, self.current_user.get("name")) as examiner:
            if examiner["examinee_requests"]:
                examiner["examinee_requests"].pop();
