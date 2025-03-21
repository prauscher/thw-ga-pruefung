#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import time
import traceback
from pathlib import Path
from datetime import datetime

import tornado
import tornado.websocket


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")


class BroadcastState:
    snr = 0
    users = {}
    # First entry in cache is never transmitted, but needed during search of _fetch
    message_cache = [{"_snr": 0}]
    _storage = Path("data.json")
    _loaded = False

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

    def startup(self):
        # Startup is called on each new connection, but should only run on first
        if self._loaded:
            return
        self._loaded = True

        if self._storage.exists():
            self.from_file(json.loads(self._storage.read_text()))
        tornado.ioloop.PeriodicCallback(self.store, 1000 * 5).start()

    def store(self):
        self._storage.write_text(json.dumps(self.to_file()))

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
    state = BroadcastState()
    auth = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.state.startup()

    @property
    def current_user(self):
        if self.auth is None:
            return {"name": "Anonymous", "role": "guest"}

        return self.state.users[self.auth]

    def open(self):
        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | New Client connected")
        self.send({"_m": "_auth_required", "first_login": not self.state.users})

    def reply(self, request, reply):
        self.send({**reply, "_cid": request.get("_cid", "")})

    def send(self, msg):
        self.write_message(json.dumps(msg))

    def broadcast(self, request, msg):
        self.state.snr = (self.state.snr + 1) & 0xffff
        msg["_cid"] = request.get("_cid", "")
        msg["_snr"] = self.state.snr
        self.state.message_cache = self.state.message_cache[-511:] + [msg]

        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | {msg['_snr']:04d} | {self.current_user['name']:<10} | {msg['_cid']:<8} | {msg}")

        for client in self._clients:
            if client.auth is not None and client.auth in self.state.users:
                client.send(msg)

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
        state = json.dumps(self.state.to_client())
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

        if not first_run and self.current_user.get("role", "") != "admin" and not self.current_user.get("grant", False):
            self.reply(msg, {"_m": "_unauthorized"})
            return

        self.state.users[msg.get("token")] = {"name": msg.get("name"), "role": msg.get("role")}

        if first_run:
            # Special case: Login after creation of first user
            self.process__login(msg)
            return

        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} |      | {self.current_user['name']:<10} | {msg['_cid']:<8} | Created user {msg.get('name')}")
        self.reply(msg, {"_m": "_success"})

    def process_request_users(self, msg):
        if self.current_user.get("role", "") != "admin" and not self.current_user.get("grant", False):
            self.reply(msg, {"_m": "_unauthorized"})
            return

        self.reply(msg, {"_m": "users", "users": self.state.users})

    def process_user_delete(self, msg):
        if self.current_user.get("role", "") != "admin" and not self.current_user.get("grant", False):
            self.reply(msg, {"_m": "_unauthorized"})
            return

        current_user = self.current_user
        self.state.users.pop(msg["token"], "")

        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} |      | {current_user['name']:<10} | {msg['_cid']:<8} | Deleted user {msg.get('name')}")
        self.reply(msg, {"_m": "_confirm"})


class AppState(BroadcastState):
    stations = {}
    examinees = {}
    assignments = {}

    def to_client(self):
        return {**super().to_client(),
                "stations": self.stations,
                "examinees": self.examinees,
                "assignments": self.assignments}

    def to_file(self):
        return {**super().to_file(),
                "stations": self.stations,
                "examinees": self.examinees,
                "assignments": self.assignments}

    def from_file(self, data):
        super().from_file(data)
        self.stations = data.get("stations", {})
        self.examinees = data.get("examinees", {})
        self.assignments = data.get("assignments", {})


class MessageHandler(BroadcastWebSocketHandler):
    state = AppState()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # TODO yes, this will run on each handler, so we use only every 60 seconds
        tornado.ioloop.PeriodicCallback(self.release_assignments, 1000 * 60).start()

    def release_assignments(self):
        for assignment_id, assignment in self.state.assignments.items():
            if assignment["end"] is None:
                continue

            if assignment["end"] > time.time():
                continue

            if assignment["result"] != "open":
                continue

            assignment["result"] = "done"
            self.broadcast({}, {"_m": "assignment", "i": assignment_id, **assignment})

    def process_station(self, msg):
        if self.current_user.get("role", "") != "admin":
             self.reply(msg, {"_m": "unauthorized"})
             return

        i = msg.get("i")
        self.state.stations[i] = {"name": msg.get("name"), "name_pdf": msg.get("name_pdf"), "tasks": msg.get("tasks")}
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
        self.broadcast(msg, {"_m": "station_delete", "i": i})

    def process_station_capacity(self, msg):
        if self.current_user.get("role", "") != "operator":
             self.reply(msg, {"_m": "unauthorized"})
             return

        i = msg.get("i")
        self.state.stations[i].update({"capacity": msg["capacity"]})
        self.broadcast(msg, {"_m": "station", "i": i, **self.state.stations[i]})

    def process_examinee(self, msg):
        if self.current_user.get("role", "") != "admin":
             self.reply(msg, {"_m": "unauthorized"})
             return

        i = msg.get("i")
        self.state.examinees[i] = {
            "name": msg.get("name"),
            "priority": int(msg.get("priority")),
            "flags": msg.get("flags", [])
        }
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
        self.broadcast(msg, {"_m": "examinee_delete", "i": i})

    def process_assign(self, msg):
        if self.current_user.get("role", "") != "operator":
             self.reply(msg, {"_m": "unauthorized"})
             return

        i = msg.get("i")
        self.state.assignments[i] = {
            "examinee": msg.get("examinee"),
            "station": msg.get("station"),
            "start": time.time(),
            "end": None if "autoEnd" not in msg else time.time() + msg["autoEnd"],
            "result": "open"}
        self.broadcast(msg, {"_m": "assignment", "i": i, **self.state.assignments[i]})

    def process_return(self, msg):
        if not self.current_user.get("role", "").startswith("operator"):
             self.reply(msg, {"_m": "unauthorized"})
             return

        i = msg.get("i")
        self.state.assignments[i].update({
            "end": time.time(),
            "result": msg.get("result")})
        self.broadcast(msg, {"_m": "assignment", "i": i, **self.state.assignments[i]})
