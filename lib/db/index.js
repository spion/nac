var anydbSQL  = require('anydb-sql');
var userstore = require('./userstore');
var path      = require('path');

var dbpath = path.join(userstore('ployd'), 'ployd.db');

module.exports = anydbSQL({
    url: "sqlite3://" + dbpath,
    connections: 1
});
