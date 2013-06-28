var app = require('./app');
var logstore = require('./logstore');
var async = require('async');
var path = require('path');
var help = require('../help');

exports.create = function create(cb) {
    var self = {};
    async.series([
        app.create().ifNotExists().exec,
        logstore.create
    ], function (err) {
        if (err) return cb(err);
        app.all(function (err, apps) {
            if (err) return cb(err);
            self.app = function (uid, name) {

                if (name.toLowerCase() == 'all') name = '.+';
                var reg = new RegExp('^' + name + '$');

                return apps.filter(function (app) {
                    return app.uid == uid && app.name.match(reg);
                });
            };
            self.create = function (uid, name, nacfile, opts, cb) {

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

            self.cleanup = function () {
                apps = apps.filter(function (app) {
                    return !app.destroyed
                });
            };

            cb(null, self);
        });
    });

};

exports.interface = function daemon_interface(uid, daemon) {
    var self = {};

    var opts = {};

    function checkError(command, arglen, cb) {
        var cmdError = help.check(command, arglen);
        if (cmdError) {
            cb(new Error(cmdError.join('\n')));
        }
        return cmdError;
    }

    ['start', 'stop', 'restart', 'kill', 'uptime', 'run',
        'logs', 'status', 'destroy', 'update'].
        forEach(function (command) {
            self[command] = function (name) {
                // remove name
                var args = [].slice.call(arguments, 1);
                var cb = args[args.length - 1];
                // remove callback
                args = args.slice(0, args.length - 1);
                if (checkError(command, args.length, cb)) return;

                var apps = daemon.app(uid, name);
                if (!apps.length)
                    return cb(new Error(name + ': no app found'));

                async.map(apps, function (app, cb) {
                    var argsCb = args.concat([cb]);
                    app[command].apply(app, argsCb);
                }, function (err, res) {
                    if (command == 'destroy')
                        daemon.cleanup();
                    cb(err, res);
                });

            }
        });
    self.create = function (name, nacfile, cb) {
        if (checkError('create', arguments.length - 2, cb)) return;
        daemon.create(uid, name, nacfile, opts, cb);
    };

    self.setOptions = function setOptions(options, cb) {
        opts = options;
        cb(null);
    };

    return self;
};

