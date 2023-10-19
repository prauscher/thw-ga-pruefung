#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import os
import os.path

import tornado
import tornado.websocket

from app.handlers import MainHandler, MessageHandler


async def main():
    app = tornado.web.Application(
        [(r"/", MainHandler),
         ("/socket", MessageHandler)],
        cookie_secret=os.environ["COOKIE_SECRET"],
        template_path=os.path.join(os.path.dirname(__file__), "templates"),
        static_path=os.path.join(os.path.dirname(__file__), "static"),
        xsrf_cookies=True,
        debug=os.environ.get("WEB_DEBUG", "no")[0] in "yt1")
    app.listen(int(os.environ.get("WEB_PORT", 8888)))
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
