#!/usr/bin/env sh

# Fix permissions for data storage
chmod 700 -R /data
chown worker -R /data

exec su-exec worker $@
