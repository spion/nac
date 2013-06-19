var sqliteSQL  = require('./sqlite-sql');
var userstore = require('./userstore');
var path      = require('path');

var dbpath = path.join(userstore('nac'), 'nacd.db');

module.exports = sqliteSQL({
    url: "sqlite3://" + dbpath,
    connections: 1
});
