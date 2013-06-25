var async = require('async');

exports.logs = function (apps, done) {
    apps.forEach(function (lines) {
        lines.reverse().forEach(function (l) {
            var dateString = new Date(l.timestamp).toISOString()
                .replace('T', ' ').replace('Z', '');
            var l = [dateString, l.tag, l.text].join('\t');
            console.log(l);
        });
    });
    done();
};

exports.status = function (apps, done) {
    var results = [
        ['name', 'active', 'uptime\t', 'pid', 'nacfile']
    ].concat(apps.map(function (status) {
            var active = status.active ? 'yes' : 'no';
            return [status.name, active, status.uptime,
                status.pid, status.nacfile];
        }));
    results.forEach(function (status) {
        console.log(status.join('\t'));
    });
    done();
};

exports.create = function (app, done) {
    console.log(app.name, '(' + app.nacfile + ')', 'created');
    console.log("configuration:");
    console.log(app.config);
    done();
};

var actionConfirmations = {
    stop: 'stopped',
    update: 'updated'
};

['start', 'stop', 'restart', 'kill', 'update', 'destroy'].forEach(function (cmd) {
    exports[cmd] = function (apps, done, params) {
        apps.forEach(function (app) {
            console.log("application", app.name,
                actionConfirmations[cmd] ? actionConfirmations[cmd] : cmd + 'ed',
                params[1] ? ': ' + params[1] : '');
        });
        done();
    }
});

exports.run = function (apps, done) {
    var counter = apps.length;
    async.map(apps, function (res, done) {
        console.log("---", res.appname, "running",
            res.script, res.args ? res.args.join(' ') : '');
        res.pipe(function (data) {
            console.log(data);
        }, function () {
            console.log("---", res.script, "finished");
            done();
        });
    }, done);
};