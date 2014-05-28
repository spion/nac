#!/usr/bin/env node

var Daemon = require('../lib/daemon/daemon');

var userstore = require('../lib/db/userstore');

var net = require('net');
var dnode = require('dnode');
var usc = require('unix-socket-credentials');
var fs = require('fs');
var async = require('async');
var mkdirp = require('mkdirp');
var path = require('path');

var isRoot = !process.getuid();

var nacdir = userstore('nac')
function nacpath(file) {
    return path.join(nacdir, file);
}
var LPATH = isRoot ? '/tmp/nacd/nacd.sock': nacpath('nacd.sock');

var daemonConfig = require('../lib/daemon/config');

var errlog = fs.createWriteStream(
        (daemonConfig.stderr || isRoot ? '/var/log/nacd.err.log' 
            : nacpath('nacd.err.log')), 
            {flags:'a'}),
    outlog = fs.createWriteStream(
        (daemonConfig.stdout || isRoot ? '/var/log/nacd.out.log' 
            : nacpath('nacd.out.log')), 
            {flags:'a'});

async.parallel([
    function(cb) { errlog.once('open', function() { cb(); }) },
    function(cb) { outlog.once('open', function() { cb(); }) },
], runDaemon);

function clientError(e) {
    var str = e ? (e.stack ? e.stack : e) : 'description not available';
    console.error('Client socket/dnode error:', str);
}

function runDaemon() {

    if (~process.argv.indexOf('--daemon'))
        require('daemon')({
            stdout: outlog,
            stderr: errlog 
        });    

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
            client.on('error', clientError);
            usc.getCredentials(client, function (err, cred) {
                if (err) return console.log(err);
                var d = dnode(Daemon.interface(cred.uid, daemon));
                d.on('error', clientError);
                client.pipe(d).pipe(client);
            });
        }

        process.on("uncaughtException", function(err) {
            if (err && err.stack)
                console.error("Uncaught:", err.stack);
            else
                console.error('Uncaught error: ' + err);
            killWorkers();
        });
        process.on("SIGINT", function() {
            console.error("\nGot SIGINT, shutting down");
            killWorkers();
        });
        process.on("SIGTERM", function() {
            console.log("\nGot SIGTERM, shutting down");
            killWorkers();
        });
        function killWorkers(err) {
            daemon.all().forEach(function(app) {
                app.kill('SIGTERM', function() {});
            });
            process.exit();
        }

    });
}

