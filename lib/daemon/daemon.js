var app = require('./app');
var logstore = require('./logstore');
var async = require('async');

var help = require('../help');

exports.create = function create(cb) {
    var self = {};
    async.series([
        app.create().ifNotExists().exec,
        logstore.create
    ], function (err) {
        app.all(function (err, apps) {
            if (err) return cb(err);
            self.app = function (uid, name) {

                if (name.toLowerCase() == 'all') name = '.+';
                var reg = new RegExp('^' + name + '$');

                return apps.filter(function (app) {
                    return app.uid == uid && app.name.match(name);
                });
            };
            self.create = function (uid, name, nacfile, cb) {
                app.construct({
                    uid: uid,
                    name: name,
                    nacfile: nacfile,
                    active: false
                }, function (err, app) {
                    if (err) return cb(err);
                    apps.push(app);
                    return cb(null, app);
                });
            };
            self.list = function (uid, name, cb) {

            };
            cb(null, self);
        });
    });

};

exports.interface = function daemon_interface(uid, daemon) {
    var self = {};

    function checkError(command, arglen, cb) {
        var cmdError = help.check(command, arglen);
        if (cmdError) {
            cb(new Error(cmdError.join('\n')));
        }
        return cmdError;
    }

    ['start', 'stop', 'restart', 'kill', 'uptime', 'run', 'logs', 'status'].
        forEach(function (command) {
            self[command] = function (name) {
                // remove name
                var args = [].slice.call(arguments, 1);
                var cb = args[args.length - 1];
                // remove callback
                args = args.slice(0, args.length - 1);
                var cmdError = help.check(command, args.length);
                if (checkError(command, args.length, cb)) return;

                var apps = daemon.app(uid, name);
                if (!apps.length)
                    return cb(new Error(name + ': no app found'));

                async.map(apps, function (app, cb) {
                    var argsCb = args.concat([cb]);
                    app[command].apply(app, argsCb);
                }, function (err, res) {
                    cb(err, res);
                });

            }
        });
    self.create = function (name, nacfile, cb) {
        if (checkError('create', arguments.length - 2, cb)) return;
        daemon.create(uid, name, nacfile, cb);
    };

    self.destroy = function (name, cb) {
        if (checkError('destroy', arguments.length - 2, cb)) return;
        daemon.destroy(uid, name, cb)
    };
    return self;
};
