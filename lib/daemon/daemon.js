var app = require('./app');
var log = require('./log');
var async = require('async');

exports.create = function create(cb) {
    var self = {};
    async.series([
        app.create().ifNotExists().exec,
        log.create().ifNotExists().exec
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

    ['start', 'stop', 'restart', 'kill', 'uptime', 'run', 'logs'].
        forEach(function (fn) {
            self[fn] = function (name) {
                var args = [].slice.call(arguments, 1);
                var cb = args[args.length - 1];
                args = args.slice(0, args.length - 1);

                async.map(daemon.app(uid, name), function (app, cb) {
                    var argsCb = args.concat([cb]);
                    app[fn].apply(app, argsCb);
                }, function (err, res) {
                    cb(err, res);
                });

            }
        });
    self.create = function (name, nacfile, cb) {
        daemon.create(uid, name, nacfile, cb);
    };
    self.status = function (name, cb) {
        cb(null, daemon.app(uid, name).map(function (app) {
            return app.status();
        }));
    };
    return self;
};

