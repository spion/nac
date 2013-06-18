var app = require('./app');


exports.create = function create(cb) {
    var self = {};
    app.all(function(err, apps) {
        if (err) return cb(err);
        self.app = function(uid, name) {
            return apps.filter(function(app) { 
                return app.uid == uid && app.name == name; 
            })[0];
        };
        self.create = app.create;
        cb(null, self);
    });    

    

}

exports.interface = function daemon_interface(uid, daemon) {
    var self = {};

    ['start', 'stop', 'restart', 'kill', 'uptime', 'run'].
    forEach(function(fn) {
        self[fn] = function (name) {
            var args = [].slice.call(arguments, 1); 
            var cb = args[args.length - 1];
            daemon.app(uid, name, function(err, app) {
                if (err) return cb(err);
                else app[fn].apply(app, args);
            });
        }
    });
    return self;
};

