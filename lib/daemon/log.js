var db = require('../db');

var duration = require('../duration');

var split = require('split');


var logs = module.exports = db.define({
    name: 'logs',
    columns: [
        { name: 'id', dataType: 'integer primary key'},
        { name: 'appId', dataType: 'integer'},
        { name: 'tag', dataType: 'text'},
        { name: 'timestamp', dataType: 'integer'},
        { name: 'text', dataType: 'text'}
    ]
});


logs.construct = function construct(appId) {
    return new Logger(appId);
};

function Logger(appId) {
    this.appId = appId;
    this.queue = [];
    this.flusher = null;
}

Logger.prototype.stream = function (tag) {
    var s = split('\n'),
        self = this;
    s.on('data', function (d) {
        self.log(tag, d.toString());
    });
    return s;
};

Logger.prototype.log = function (tag, text) {
    this.queue.push({
        tag: tag,
        timestamp: Date.now(),
        text: text
    });
    if (!this.flusher)
        this.flusher = setTimeout(this._flush.bind(this), 333);
};

Logger.prototype._flush = function (cb) {
    var self = this;

    if (!self.appId) return;
    self.flusher = null;

    var q = self.queue;
    self.queue = [];

    q.forEach(function (entry) {
        entry.appId = self.appId;
    });


    this._write(q, function (err) {
        if (err) {
            self.queue = q.concat(self.queue);
            return cb && cb(err);
        }
        return cb && cb(null);
    });

};

Logger.prototype._write = function (list, cb) {
    logs.insert(list).exec(cb);
};


Logger.prototype.lines = function (opt, cb) {


    var q = logs.where({appId: this.appId});

    opt.last = opt.last || 100;

    var tsStart = 0;
    var tsEnd = Date.now();
    if (opt.past) {
        tsStart = Date.now() - duration.parse(opt.past);
        if (opt.duration)
            tsEnd = tsStart + duration.parse(opt.duration);
    }

    var q = logs.where({appId: this.appId}).order(logs.timestamp.descending, logs.id.descending);

    q = q.where(logs.timestamp.gt(tsStart));
    q = q.where(logs.timestamp.lt(tsEnd));
    if (opt.tag) q = q.where({tag: opt.tag});
    if (opt.last) q = q.limit(opt.last);

    q.all(cb);

};
