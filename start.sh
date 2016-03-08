#!/bin/sh
# we want the node server in the foreground to make it easier to kill
# so we launch it last.
# the start_browser will sleep to wait for node to launch
osascript server/start_browser.osascript &
echo "..Standby - starting a server then launching a browser...\n"
server/bin/node server/server.js
# open -F http://localhost:3000
