#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import traceback
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
    message_cache = [{"_snr": 0, "_m": "_empty"}]

    def to_client(self):
        return {"_snr": self.snr}


class BroadcastWebSocketHandler(tornado.websocket.WebSocketHandler):
    _clients = set()
    state = BroadcastState()
    auth = None

    @property
    def current_user(self):
        if self.auth is None:
            return {"name": "Anonymous", "grant": False}

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
        self.reply(msg, {"_m": "_init", "user": user, "state": self.state.to_client()})

    def process__fetch(self, msg):
        msgs = []
        for cached_msg in reversed(self.state.message_cache):
            if msg["since_snr"] == cached_msg["_snr"]:
                break
            msgs.append(cached_msg)
        else:
            # Could not find the message in cache, force reload
            self.reply(msg, {"_m": "_reload"})
            return

        for cached_msg in reversed(msgs):
            self.send(cached_msg)

        self.reply(msg, {"_m": "_fetch_complete"})

    def process__create_user(self, msg):
        first_run = not self.state.users

        if not first_run and not self.current_user["grant"]:
            self.reply(msg, {"_m": "_unauthorized"})
            return

        self.state.users[msg.get("token")] = {"name": msg.get("name"), "grant": msg.get("grant")}

        if first_run:
            # Special case: Login after creation of first user
            self.process__login(msg)
            return

        self.reply(msg, {"_m": "_success"})


class AppState(BroadcastState):
    stations = {}
    examinees = {}
    assignments = {}

    def to_client(self):
        return {**super().to_client(),
                "stations": self.stations,
                "examinees": self.examinees,
                "assignments": self.assignments}


class MessageHandler(BroadcastWebSocketHandler):
    state = AppState()

    def process_station(self, msg):
        i = msg.get("i")
        self.state.stations[i] = {"name": msg.get("name")}
        self.broadcast(msg, {"_m": "station", "i": i, **self.state.stations[i]})

    def process_examinee(self, msg):
        i = msg.get("i")
        self.state.examinees[i] = {"name": msg.get("name")}
        self.broadcast(msg, {"_m": "examinee", "i": i, **self.state.examinees[i]})
