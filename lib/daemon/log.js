var db = require('../db');
var split = require('through');


var logs = module.exports = db.define({
    name: 'logs',
    columns: ['appId', 'tag', 'timestamp', 'text']
});


var Logger = logs.create = function Logger(appId) {
    this.appId = appId;
    this.queue = [];
    this.flusher = null;
}

Logger.prototype.stream = function(tag) {
    var s = split('\n'), 
        self = this; 
    s.on('data', function(d) {
        self.log(tag, d.toString());
    });
    return s;
}

Logger.prototype.log = function(tag, text) {
    this.queue.push({
        tag: tag,
        timestamp: Date.now(),
        text: text, 
    });
    if (!this.flusher)
        this.flusher = setTimeout(this._flush.bind(this), 333);
}

Logger.prototype._flush = function(cb) {
    var self = this;
    if (!self.appId) return; 
    self.flusher = null;    

    var q = self.queue, self.queue = [];
    q.forEach(function(entry) { entry.appId = this.appId; });

    this._write(q, function(err) {
        if (err) {
            self.queue = q.concat(self.queue);
            return cb && cb(err);
        }
        return cb && cb(null);
    });

};

Logger.prototype._write = function(list, cb) {
    logs.insert(q).exec(cb);
};
