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


class BroadcastWebSocketHandler(tornado.websocket.WebSocketHandler):
    _clients = set()

    def open(self):
        self._clients.add(self)

    def broadcast(self, message):
        for client in self._clients:
            client.write_message(message)

    def on_close(self):
        self._clients.remove(self)


class JsonBroadcastWebSocketHandler(BroadcastWebSocketHandler):
    # Must use a complex datatypes here to make sure it is shared across all instances
    state = {"no": 0}

    def open(self):
        super().open()
        self.write_message(json.dumps({**self.state, "m":"init"}))
        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | New Client connected")

    def on_message(self, message):
        # Ignore anything after error
        if not self.ws_connection or self.ws_connection.is_closing():
            return None

        try:
            msg = json.loads(message)

            handler = getattr(self, f"process_{msg.get('m','')}", None)
            if handler:
                handler(**{key: value for key, value in msg.items() if key != "m"})
        except Exception as exception:
            traceback.print_exception(exception)
            self.close(1003, "failed to parse")
            return

        self.state["no"] += 1
        self.broadcast(json.dumps({**msg, "no": self.state["no"]}))
        print(f"{datetime.now():%Y-%m-%d %H:%M:%S.%f} | {self.state['no']:04d} | {msg}")


class MessageHandler(JsonBroadcastWebSocketHandler):
    state = {**JsonBroadcastWebSocketHandler.state,
             "stations": {},
             "examinees": {}}

    def process_station(self, i, **kwargs):
        self.state["stations"][i] = kwargs

    def process_examinee(self, index, name):
        self.state["examinees"][i] = kwargs
