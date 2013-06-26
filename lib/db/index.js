var anydbSQL = require('anydb-sql');
var userstore = require('./userstore');
var path = require('path');

var dbpath = path.join(userstore('nac'), 'nacd.db');

module.exports = anydbSQL({
    url: "sqlite3://" + dbpath,
    connections: 1
});

module.exports.query('PRAGMA synchronous = FULL;');
