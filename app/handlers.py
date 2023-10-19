#!/usr/bin/env python3
# -*- coding: utf-8 -*-

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
    def on_message(self, message):
        # TODO process command
        self.broadcast(f"{self}: {message}")
        print(self, message)
