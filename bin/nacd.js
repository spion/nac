#!/usr/bin/env node

var Daemon = require('../lib/daemon/daemon');
var net = require('net');
var dnode = require('dnode');
var usc = require('unix-socket-credentials');
var fs = require('fs');

var mkdirp = require('mkdirp');
var path = require('path');

var LPATH = '/tmp/nacd/nacd.sock';

Daemon.create(function (err, daemon) {
    if (err) return console.log(err) || process.exit(1);

    if (fs.existsSync(LPATH))
        fs.unlinkSync(LPATH);

    mkdirp.sync(path.dirname(LPATH), 0755);

    net.createServer(serveClient).listen(LPATH, function () {
        fs.chmodSync(LPATH, 0755);
    });

    function serveClient(client) {
        usc.getCredentials(client, function (err, cred) {
            if (err) return console.log(err);
            var d = dnode(Daemon.interface(cred.uid, daemon));
            client.pipe(d).pipe(client);
        });
    }

});

