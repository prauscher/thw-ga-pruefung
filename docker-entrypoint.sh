#!/usr/bin/env bash

# Fix permissions for data storage
chmod 700 -R /data
chown worker -R /data

exec gosu worker $@
