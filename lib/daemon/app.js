var db = require('../db');

var dcfg = require('./config');
var appconfOverride = require('./appconf-override');
var optsNormalizer = require('./normalize-opts');

var util = require('util');
var yaml = require('js-yaml');

var EventEmitter = require('events').EventEmitter;

var split = require('split');

var log = require('./log')

var duration = require('../duration');

var app = module.exports = db.define({
    name: 'apps',
    columns: ['id', 'uid', 'name', 'nacfile', 'active']
});


var spawn = require('child_process').spawn;


app.all = function(cb) {
    return app.select().all(function(err, apps) {
        async.map(apps, app.create, function(err, created) {

        }
    });
}

app.create = function(opts, cb) {
    fs.readFile(opts.nacfile, function(err, data) {
        try {
            var config = yaml.safeLoad(data.toString(), { 
                filename: opts.nacfile 
            }));
            opts.config = config;
            var app = new App(opts);
            if (!app.id) app.save(function(err) {
                if (this.active) 
                    this.start();
                cb(err);
            }) else {
                if (this.active) 
                    this.start();
            }
        } catch (e) {
            cb(e);
        }
    });
};


util.inherits(App, EventEmitter);

function App(opts) {
    EventEmitter.call(this);
    var f = opts.config
    this.config = appconfOverride(dcfg.tags, opts.config);
    this.nacfile = opts.nacfile;
    this.name = opts.name;
    this.active = opts.active;
    this.uid = opts.uid;
    this.id = opts.id;
    this.started = false;
    this.cwd = path.join(path.dirname(this.nacfile), this.config.cwd || '');

    this.logger = log.create(this);
}

App.prototype.init(opts) {
}


App.prototype.save = function(cb) {
    var self = this;
    var fields = {
        uid: this.uid, 
        name: this.name, 
        nacfile: this.nacfile,
        active: this.active
    };

    if (!this.id) 
        app.select(app.id).where({uid:self.uid, name: self.name})
            .get(function(err, res) {
                if (res) { return cb(new Error("App already exists")) }
                app.insert(fields).exec(function(err, cb) {
                    if (err) return cb(err);
                    app.where({uid:self.uid, name: self.name})
                        .get(function(err, app) {
                            if (err) 
                                return cb && cb(err);
                            self.id = app.id;
                            return cb && cb(null, self);
                        });
                });
            });
    else app.where({id: this.id}).update(fields)
            .exec(function(err, cb) {
                if (err) 
                    return cb && cb(err);
                return cb && cb(null, self);
            });
};

App.prototype._runProcessess = function() {
    this.started = Date.now();
    var proc = this.process = spawn(this.config.command, args, {
        env: this.config.env,
        cwd: this.cwd,
        uid: this.uid,
        gid: this.uid
    });
    proc.on('exit', this._onExit.bind(this));
    proc.stdout.pipe(this.logger.stream('stdout'));
    proc.stderr.pipe(this.logger.stream('stderr'));    
 
    return proc;
};

App.prototype.start = function(cb) {
    if (this.started) return;
    this.started = Date.now();
    this.emit('before_start');
    var args = optsNormalizer(this.config.args);
    
    var cmd = this.config.command;
    var env = this.config.env;

    this._runProcess();

    this.logger.log('start', "application started"); 
    this.emit('start');

    cb(null);
};

App.prototype._onExit = function(code, signal) {
    if (this.restarting || (this.active && this.signal == null)) { 
        // didnt die by signal or died while restarting.
        this.restarting = false;

        var backoff = this.config.backoff || {};
        backoff.min = backoff.min || 0.25;
        backoff.max = backoff.max || 120;
        this.respawntime = this.respawntime || backoff.min;
       
        var timeout = Math.min(this.respawntime, backoff.max); 

        if (!this.restarting)
            this.logger.log('respawn', 'process died with exit code ' + code 
                        + ', respawning in ' + timeout.toFixed(1) + 's');

        var realTimeout = timeout * 1000 - (Date.now() - this.started);
        realTimeout = Math.max(realTimeout, 1); // min 1ms

        setTimeout(this._runProcess.bind(this), realTimeout);
        this.respawntime *= 2;
        setTimeout(function() {
            this.respawntime = this.respawntime / 2;
        }.bind(this), backoff.max);

    } else if (this.signal) {
        this.logger.log('exit', 'process died after receiving ' + this.signal)
        this.active = false;
        this.started = null;
        this.save();
    }
};

App.prototype.stop = function(cb) {
    this.process.kill();
};

App.prototype.restart = function(cb) {
    this.restarting = true;
    this.logger.log("restart", "received restart command");
    this.process.kill();
}

App.prototype.kill = function(signal, cb) {
    this.process.kill(signal);
    return cb(null);
};

App.prototype.run = function(script, args, cb) {
    if (!this.config.scripts[script]) 
        return cb(new Error('Unknown script: ' + script));

    var scriptpath = path.join(process.dirname(this.nacfile), this.config.scripts[script]);
    var scriptwd = path.dirname(scriptpath);
    var env = _.merge({}, this.config.env, {
        NACFILE: this.nacfile,
        NACDIR: this.cwd 
    });
    
    this.logger.log("script", "running " + script + ' ' + args.join(' '));
    var script = spawn(scriptpath, args, {
        env: env,
        cwd: scriptwwd,
        uid: this.uid,
        gid: this.uid
    });

    var output = through();

    script.stdout.pipe(output);
    script.stderr.pipe(output);

    output.pipe(this.logger.stream('script'));

    return cb && cb(null, output);

};

App.prototype.update = function(cfgFile, cb) {

    fs.readFile(opts.nacfile, function(err, data) {
};

App.prototype.uptime = function(cb) {
    if (!this.started) return 'inactive';
    return cb(null, duration(Date.now() - this.started));
}



