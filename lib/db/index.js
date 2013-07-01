var anydbSQL = require('anydb-sql');
var userstore = require('./userstore');
var path = require('path');

var dbpath = process.env.NACD_DATABASE == null
           ? path.join(userstore('nac'), 'nacd.db')
           : process.env.NACD_DATABASE;

module.exports = anydbSQL({
    url: "sqlite3://" + dbpath,
    connections: 1
});

module.exports.query('PRAGMA synchronous = FULL;');
