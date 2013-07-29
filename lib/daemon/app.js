var db = require('../db');
var log = require('./logger');

var through = require('through');

var daemonConfig = require('./config');

var appconfOverride = require('../appconf-override');
var opts2args = require('../opts2args');
var duration = require('../duration');


var util = require('util');
var fs = require('fs');
var path = require('path');

var yaml = require('js-yaml');
var async = require('async');
var _ = require('lodash');

var EventEmitter = require('events').EventEmitter;


var app = module.exports = db.define({
    name: 'apps',
    columns: [
        { name: 'id', dataType: 'integer primary key' },
        { name: 'uid', dataType: 'integer' },
        { name: 'name', dataType: 'text' },
        { name: 'nacfile', dataType: 'text' },
        { name: 'active', dataType: 'integer' }
    ]
});


var spawn = require('child_process').spawn;


app.all = function (cb) {
    app.select().all(function (err, apps) {
        if (err) return cb(err);
        if (apps) return async.map(apps, function (appinfo, cb) {
            return app.construct(_.merge({boot: true}, appinfo), cb);
        }, cb);
        return cb(null, []);
    });
};

app.construct = function (opts, cb) {
    if (opts.name == 'all')
        return cb(new Error('Name "all" is reserved'));

    fs.readFile(opts.nacfile, function (err, data) {
        try {
            if (!err) {
                var config = yaml.safeLoad(data.toString(), {
                    filename: opts.nacfile
                });
                opts.config = config;
            } else if (opts.boot) {
                opts.config = {};
            }
            var app = new App(opts);

            var done = (function (err) {
                if (err) return cb(err);
                if (this.active)
                    return this.start(cb);
                return cb(null, app);
            }.bind(app));

            if (!app.id) app.save(done);
            else done();

        } catch (e) {
            cb(e);
        }
    });
};


util.inherits(App, EventEmitter);

function App(opts) {
    EventEmitter.call(this);
    this.id = opts.id;
    this.uid = opts.uid;
    this.name = opts.name;
    this.active = opts.active;
    this.started = false;
    this.setConfig(opts.nacfile, opts.config);
}

App.prototype.setConfig = function (nacfile, config) {
    this.nacfile = nacfile;
    this.config = appconfOverride(daemonConfig.tags, config);
    this.cwd = path.resolve(path.dirname(nacfile), config.cwd || '');
    this.logger = log.construct(this.id);

    // set exponential backoff defaults
    var backoff = this.config.respawn = this.config.respawn || {};
    backoff.min = backoff.min || 0.25;
    backoff.max = backoff.max || 120;
    this.respawntime = this.respawntime || backoff.min;

};


App.prototype.save = function (cb) {
    var self = this;
    var fields = {
        uid: this.uid,
        name: this.name,
        nacfile: this.nacfile,
        active: this.active
    };

    if (!this.id)
        app.select(app.id).where({uid: self.uid, name: self.name})
            .get(function (err, res) {
                if (res)
                    return cb(new Error("App already exists"));
                app.insert(fields).exec(function (err, res) {
                    if (err) return cb(err);
                    app.where({uid: self.uid, name: self.name})
                        .get(function (err, app) {
                            if (err) return cb && cb(err);
                            self.id = app.id;
                            self.logger.appId = self.id;
                            return cb && cb(null, self);
                        });
                });
            });
    else app.where({id: this.id}).update(fields)
        .exec(function (err, res) {
            return cb && cb(err, self);
        });
};

App.prototype._getEnv = function () {
    return _.merge({}, process.env, this.config.env, {
        NACFILE: this.nacfile,
        NACDIR: this.cwd,
        NACNAME: this.name
    });
};

App.prototype._runProcess = function (done) {
    this.started = Date.now();


    var args = opts2args(this.config.args);

    if (!this.config.command)
        return setTimeout(function () {
            this.active = false;
            this.started = null;
            return done && done(
                new Error('unable to read configuration parameter "command"'));
        }.bind(this))

    var proc = this.process = spawn(
        this.config.command, args, {
            env: this._getEnv(),
            cwd: this.cwd,
            uid: this.uid,
            gid: this.uid
        });
    proc.on('error', function(err) {
        if (answerOk) { 
            clearTimeout(answerOk);
            answerOk = null;
            if (done) done(err);
        }
        this._onExit(err)
    }.bind(this));
    proc.on('exit', this._onExit.bind(this));
    proc.stdout.pipe(this.logger.stream('stdout'));
    proc.stderr.pipe(this.logger.stream('stderr'));


    var self = this;

    // Hack: the node.js api docs don't say when
    // the error event is expected, if the spawn fails so we use a 
    // "reasonable" timeout of 100ms here
    if (done) var answerOk = setTimeout(function() {
        answerOk = null;
        done(null);
    }, 100);
    return proc;
}
;

App.prototype.start = function (cb) {
    var self = this;
    if (this.started) 
        return cb(new Error("app " + this.name + " already started"));
    
    if (this._respawner) {
        clearTimeout(this._respawner);
        this._respawner = null;
    }
    this.active = true;
    this.started = Date.now();
    this.emit('before-start');

    this.save(function (err) {
        if (err) {
            this.logger.log('start', "application failed to save: " 
                + err.message);
            return cb(err);
        }
        this._runProcess(function (err) {
            if (err) {
                this.logger.log('start', "application failed to start: " 
                    + err.message);
                cb(err, this);
            } else {
                this.logger.log('start', "application started");
                this.emit('start');
                cb(null, this);
            }

        }.bind(this));
    }.bind(this));


};

App.prototype._onExit = function (code, signal) {

    var lastStarted = this.started;
    this.started = null;

    if (this.active) {
        var restarting = this.restarting;
        // didnt die by signal or died while restarting.
        this.restarting = false;

        var backoff = this.config.respawn;

        var timeout = Math.min(this.respawntime, backoff.max);
        var realTimeout = timeout * 1000 - (Date.now() - lastStarted);
        realTimeout = Math.max(realTimeout, 1); // min 1ms

        if (restarting)
            realTimeout = 1;

        if (!restarting)
            this.logger.log('respawn', 'process died with exit code ' + code
                + ', respawning in ' + timeout.toFixed(1) + 's');

        this.emit('respawn', {
            signal: signal,
            code: code
        });


        this._respawner = setTimeout(this._runProcess.bind(this), realTimeout);


        if (!restarting) {
            this.respawntime = Math.min(this.respawntime * 2, backoff.max);
            this._backoff();
        }


    } else {

        this.logger.log('exit', 'process died with code ' + code 
            + ' after receiving ' + signal);
        this.emit('exit', {code: code, signal: signal});

    }
};

App.prototype._backoff = function _backoff() {
    var backoff = this.config.respawn;


    if (this._backoffTimer)
        clearTimeout(this._backoffTimer);

    this._backoffTimer = setTimeout(function () {
        this._backoffTimer = null;
        this.respawntime = this.respawntime / 2;
        if (this.respawntime <= backoff.min)
            this.respawntime = backoff.min;
        else
            this._backoff();
    }.bind(this), backoff.max * 1000);

};

App.prototype.stop = function stop(cb) {

    this.logger.log('stop', 'received stop command');

    this.active = false;
    if (this._respawner) {
        clearTimeout(this._respawner);
        this._respawner = null;
    }
    this.save(function (err) {
        if (err) return cb(err);
        if (this.process)
            this.process.kill();
        cb(null, this);
    }.bind(this));


};

App.prototype.restart = function restart(cb) {
    if (!this.process)
        this.start(cb)
    else {
        this.logger.log('restart', 'received restart command');
        this.restarting = true;
        this.process.kill();
        cb(null, this);
    }

};

App.prototype.kill = function kill(signal, cb) {
    try {
        this.process.kill(signal);
        this.logger.log('kill', signal);
    } catch (e) {
        return cb(e);
    }
    return cb(null, this);
};

App.prototype.run = function run(script) {
    var args = [].slice.call(arguments, 1);
    var cb = args[args.length - 1];
    args = opts2args.flatten(args.slice(0, args.length - 1))

    if (!this.config.scripts || !this.config.scripts[script])
        return cb && cb(new Error('Unknown script: ' + script));

    var scriptpath = path.join(
        path.dirname(this.nacfile),
        this.config.scripts[script]);

    var scriptwd = path.dirname(scriptpath);

    this.logger.log("script", "--- running " + script + ' ' + args.join(' '));

    var scriptp = spawn(scriptpath, args, {
        env: this._getEnv(),
        cwd: scriptwd,
        uid: this.uid,
        gid: this.uid
    });

    var output = through();

    scriptp.stdout.pipe(output);
    scriptp.stderr.pipe(output);

    scriptp.on('error', function (e) {
        var msg = script + args.join(' ') + " > error " + e.message;
        this.logger.log("script", msg);
    }.bind(this));

    scriptp.on('exit', function (code) {
        setImmediate(this.logger.log.bind(this.logger, "script", 
            "--- exited " + script + ' ' + args.join(' ')
            + "with error code " + code));
    }.bind(this));

    var clientStream = through();

    clientStream.pause();

    output.pipe(clientStream);
    output.pipe(this.logger.stream('script'));


    var dataend = function (datacb, endcb) {
        clientStream.on('data', function (d) {
            datacb(d.toString());
        });
        clientStream.on('end', endcb);
        clientStream.resume();
    };


    return cb && cb(null, {
        appname: this.name,
        script: script,
        file: this.config.scripts[script],
        pipe: dataend
    });

};

App.prototype.update = function (nacfile, cb) {
    this.logger.log('update', nacfile);
    if (!cb) {
        cb = nacfile;
        nacfile = this.nacfile;
    }
    fs.readFile(nacfile, function (err, data) {
        var config = yaml.safeLoad(data.toString(), {
            filename: nacfile
        });
        this.setConfig(nacfile, config);
        cb(null, this);
    }.bind(this));

};

App.prototype.uptime = function (cb) {
    if (!this.started)
        if (cb) return cb(null, '-       ')
        else return '-       ';

    var uptime = duration.stringify(Date.now() - this.started);
    if (cb) cb(null, uptime);
    else return uptime;
};

App.prototype.status = function (cb) {
    var status = {
        name: this.name,
        nacfile: this.nacfile,
        active: this.active,
        uptime: this.uptime(),
        pid: this.process ? this.process.pid : '-'
    };
    if (cb) cb(null, status);
    return status;
};


App.prototype.logs = function (opt, cb) {
    if (!cb) {
        cb = opt;
        opt = {};
    }
    this.logger.lines(opt, cb);
};


App.prototype.destroy = function (cb) {
    this.stop(function (err) {
        if (err) return cb(err);
        app.where({id: this.id}).delete().exec(function (err) {
            if (err) return cb(err);
            this.destroyed = true;
            cb(null, this);
        }.bind(this));
    }.bind(this));
};
