#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import logging
import os
import os.path
import signal
import sys

import tornado
import tornado.websocket

from app.handlers import MainHandler, MessageHandler, ReplayHandler, BuildReplayHandler


def sig_handler(sig, frame):
    logging.warning('Caught signal: %s', sig)
    ioloop = tornado.ioloop.IOLoop.instance()
    ioloop.stop()
    sys.exit(0)


def main():
    app = tornado.web.Application(
        [(r"/", MainHandler),
         (r"/replay", ReplayHandler),
         (r"/replay/build", BuildReplayHandler),
         ("/socket", MessageHandler)],
        cookie_secret=os.environ["COOKIE_SECRET"],
        template_path=os.path.join(os.path.dirname(__file__), "templates"),
        static_path=os.path.join(os.path.dirname(__file__), "static"),
        xsrf_cookies=True,
        debug=os.environ.get("WEB_DEBUG", "no")[0] in "yt1")

    global server
    server = tornado.httpserver.HTTPServer(app)
    server.listen(int(os.environ.get("WEB_PORT", 8888)))

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()

    logging.info("Exit...")


if __name__ == "__main__":
    main()
