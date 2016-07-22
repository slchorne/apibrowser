# Quickstart

There are 2 options:

* Install the client code on a running grid
* Install a standalone version on a PC/laptop

## install just the 'client' code

Copy all the contents of the client folder to the 'HTTP file distribution' on the grid master,
makes sure it goes into a 'snapins' folder.

## standalone version

Download and install 'node'.

switch to the 'server' folder

Run 'npm install'

It should read the package.json and install all the deps

Start the server:

    node server/server.js

Open a browser window to 'http://localhost:3000'


