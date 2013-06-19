var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');

var helpfile = fs.readFileSync(path.join(__dirname, 'commands.yaml'));

var commands = yaml.safeLoad(helpfile.toString());

exports.check = function (command, numargs) {

    if (!commands[command])
        return ["Uknown command: " + command, ''].concat(exports.list());


    var cmd = commands[command],
        argspec = cmd.usage || '';


    var argl = argspec.split(' ');
    var maxArgs = argl.length;
    if (!argspec.length)
        maxArgs = 0;
    if (argl[argl.length - 1] == '...')
        maxArgs = Double.POSITIVE_INFINITY;

    var minArgs = argl.filter(function (arg) {
        return arg[0] == '<'
    }).length;

    if (minArgs <= numargs && numargs <= maxArgs)
        return null;
    else
        return exports.usage(command);

};

exports.list = function () {
    var res = ["Available commands:"];
    for (var cmd in commands) {
        res.push(cmd + "\t" + commands[cmd].desc);
    }
    res.push('');
    return res;
};

exports.usage = function (command) {
    if (!commands[command])
        return ["Uknown command: " + command, ''].concat(exports.list());

    var cmd = commands[command], res = [];

    var usage = cmd.usage;
    res.push("Usage: nac <app> " + command + ' ' + usage);
    res.push('');
    res.push(cmd.more);
    return res;
};