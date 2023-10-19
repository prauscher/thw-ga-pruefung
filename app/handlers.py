#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from datetime import datetime

import tornado
import tornado.websocket


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")


class BroadcastWebSocketHandler(tornado.websocket.WebSocketHandler):
    _clients = set()

    def open(self):
        self._clients.add(self)

    def broadcast(self, message):
        for client in self._clients:
            client.write_message(message)

    def on_close(self):
        self._clients.remove(self)


class MessageHandler(BroadcastWebSocketHandler):
    state = {}
    last_msg = 0

    def open(self):
        super().open()
        self.write_message(json.dumps({"m":"init", "state": self.state, "no": self.last_msg}))

    def process_station(self, index, name):
        if "stations" not in self.state:
            self.state["stations"] = {}
        self.state["stations"][index] = name

    def on_message(self, message):
        msg = json.loads(message)

        handler = getattr(self, f"process_{msg.get('m','')}")
        if handler:
            handler(**msg)

        self.last_msg += 1
        self.broadcast(json.dumps({"no": self.last_msg, **msg}))
        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | {self.last_msg:04d} | {msg}")
