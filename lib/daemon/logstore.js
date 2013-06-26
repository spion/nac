var db = require('../db'),
    async = require('async'),
    duration = require('../duration');

var logs = db.define({
    name: 'logs',
    columns: [
        { name: 'id', dataType: 'integer primary key'},
        { name: 'appId', dataType: 'integer'},
        { name: 'tag', dataType: 'text'},
        { name: 'timestamp', dataType: 'integer'},
        { name: 'text', dataType: 'text'}
    ]
});


var flusher, queue = [];


exports.write = function write(item) {
    queue.push(item);
    if (!flusher)
        flusher = setTimeout(flush, 333);
};


function flush(cb) {
    if (flusher) {
        clearTimeout(flusher);
        flusher = null;
    }

    var q = queue;
    queue = [];

    insert(q, function (err) {
        if (err) {
            queue = q.concat(queue);
            return cb && cb(err);
        }
        return cb && cb(null);
    });

}

function insert(list, cb) {
    var tx = db.begin();
    async.map(list, function (item, cb) {
        logs.insert(item).execWithin(tx, cb);
    }, function (err) {
        if (err) return cb(err);
        tx.commit(function (err) {
            if (err) return cb(err);
            return cb();
        });
    });
}


exports.read = function read(opt, cb) {

    opt.last = opt.last || 100;

    var tsStart = 0;
    var tsEnd = Date.now();
    if (opt.past) {
        tsStart = Date.now() - duration.parse(opt.past);
        if (opt.duration)
            tsEnd = tsStart + duration.parse(opt.duration);
    }

    var q = logs.where({appId: opt.appId})
        .order(logs.timestamp.descending, logs.id.descending);


    q = q.where(logs.timestamp.gt(tsStart));
    q = q.where(logs.timestamp.lt(tsEnd));
    if (opt.tag) q = q.where({tag: opt.tag});
    if (opt.last) q = q.limit(opt.last);


    q.all(cb);
};

exports.create = function (cb) {
    var tableQuery = logs.create().ifNotExists(),
        indexQuery = logs.indexes().create().on(logs.appId, logs.timestamp);
    console.log("indexes exec = ", logs.indexes().create().exec);
    return async.series([
        tableQuery.exec.bind(tableQuery),
        indexQuery.exec.bind(indexQuery)
    ], cb);
};