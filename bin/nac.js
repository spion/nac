#!/usr/bin/env node

var dnode = require('dnode'),
    net = require('net'),
    args = require('optimist')
        .demand(2)
        .usage('Usage: $0 <app> <command> [options]')
        .argv;

var help = require('../lib/help');

var command = args._[1],
    params = [args._[0]].concat(args._.slice(2));

delete args['_'];
if (Object.keys(args).length > 1)
    params.push(args);

//console.log(command, params);


var parsers = require('../lib/client-parsers');

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

var c = net.connect({path: '/tmp/nacd/nacd.sock'}, function () {
    var d = dnode();

    d.on('remote', function (remote) {
        var args = params.concat([function callback(err, res) {
            if (err) {
                console.error("error:", err.message);
                process.exit(1);
            } else {
                if (parsers[command])
                    parsers[command](res, process.exit.bind(process, 0), params);
                else {
                    console.log(res);
                    process.exit(0);
                }

            }
        }]);
        remote[command].apply(remote, args);
    });
    c.pipe(d).pipe(c);
});