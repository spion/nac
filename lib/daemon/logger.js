var duration = require('../duration');

var split = require('split');

var logstore = require('./logstore');

var _ = require('lodash');

var logs = module.exports = {};

logs.construct = function construct(appId) {
    return new Logger(appId);
};

function Logger(appId) {
    this.appId = appId;
    this.logstore = logstore;
}

Logger.prototype.stream = function (tag) {
    var s = split('\n');
    s.on('data', function (d) {
        this.log(tag, d.toString());
    }.bind(this));
    return s;
};

Logger.prototype.log = function (tag, str) {
    this.logstore.write({
        appId: this.appId,
        tag: tag,
        timestamp: Date.now(),
        text: str
    })
};


Logger.prototype.lines = function (opt, cb) {

    return this.logstore.read(_.extend({appId: this.appId}, opt), cb);

};
