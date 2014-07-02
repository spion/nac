#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var dnode = require('dnode'),
    net = require('net'),
    args = require('optimist')
        .demand(1)
        .usage('Usage: $0 <app> <command> [options]')
        .argv;

var help = require('../lib/help');
var userstore = require('../lib/db/userstore');

var command = args._[1],
    params = [args._[0]].concat(args._.slice(2));

if (params[0] == 'help') {
    command = 'help';
    params = ['-'].concat(args._.slice(1));
}

delete args['_'];
if (Object.keys(args).length > 1)
    params.push(args);


var parsers = require('../lib/client-parsers');

var processors = require('../lib/client-processors');

var hasError = help.check(command, params.length - 1);

if (hasError) {
    console.error(hasError.join('\n'));
    process.exit(1);
}

if (command == 'help') {
    if (params[1]) console.log(help.usage(params[1]).join('\n'));
    else console.log(help.list().join('\n'));
    process.exit(0);
}

if (processors[command])
    params = processors[command](params);


function onRemote(remote) {
    var cb = function callback(err, res) {
        var okExit = process.exit.bind(process, 0);
        if (err) {
            console.error("error:", err.message);
            process.exit(1);
        } else {
            if (parsers[command])
                parsers[command](res, okExit, params);
            else {
                console.log(res);
                okExit();
            }

        }
    };
    var args = params.concat([cb]);
    remote[command].apply(remote, args);
}

var sockPath = path.join(userstore('nac'), 'nacd.sock');
var c = net.connect({path: sockPath}, onConnected);

c.once('error', function(e) {
    c = net.connect({path: '/tmp/nacd/nacd.sock'}, onConnected);
    c.on('error', giveUp);
});

function onConnected() {
    var d = dnode();
    d.on('remote', onRemote);
    c.pipe(d).pipe(c);
}


function giveUp(e) {
    console.error("Error connecting to the daemon socket at:\n - %s\n - %s\n" +
        "Is the daemon running?", sockPath, '/tmp/nacd/nacdsock');
    console.error(e);
}

