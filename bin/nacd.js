#!/usr/bin/env node

var Daemon = require('../lib/daemon/daemon');

var userstore = require('../lib/db/userstore');

var net = require('net');
var dnode = require('dnode');
var usc = require('unix-socket-credentials');
var fs = require('fs');

var mkdirp = require('mkdirp');
var path = require('path');

var LPATH = 
    process.getuid() 
        ? path.join(userstore('nac'), 'nacd.sock')
        : '/tmp/nacd/nacd.sock'


if (~process.argv.indexOf('--daemon'))
    require('daemon')();


Daemon.create(function (err, daemon) {

    if (err) return console.error('', err.stack) || process.exit(1);

    if (fs.existsSync(LPATH))
        fs.unlinkSync(LPATH);

    mkdirp.sync(path.dirname(LPATH), 0755);
    fs.chmodSync(path.dirname(LPATH), 0755);

    net.createServer(serveClient).listen(LPATH, function () {
        fs.chmodSync(LPATH, 0666);
    });

    function serveClient(client) {
        usc.getCredentials(client, function (err, cred) {
            if (err) return console.log(err);
            var d = dnode(Daemon.interface(cred.uid, daemon));
            client.pipe(d).pipe(client);
        });
    }

    function killWorkers() {
        daemon.all().forEach(function(app) {
            app.kill('SIGTERM', function() {});
        });
        process.exit();
    }
    process.on("uncaughtException", killWorkers);
    process.on("SIGINT", killWorkers);
    process.on("SIGTERM", killWorkers);

});



