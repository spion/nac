var sqlite = require('sqlite3');
var sql = require('sql');
var url = require('url');
var path = require('path');


var createPool = function (dbpath, conns) {
    //return anyDB.createPool(path, conns);
    var parsed = url.parse(dbpath);
    var dbfile = path.join(parsed.hostname, parsed.path);
    var db = new sqlite.Database(dbfile);
    db.serialize();
    var self = {};

    self.query = function query(q, args, cb) {
        db.all(q, args, function (err, res) {
            //console.log("---");
            //console.log(q, args);
            //console.log("res:", err, res);
            //console.log(cb.toString());
            cb && cb(err, res);
        });
    };
    self.begin = function () {
        self.query('BEGIN;')
        return self;
    };
    self.commit = function (cb) {
        self.query('COMMIT;', cb)
    };
    self.close = db.close.bind(db);
    return self;
};

module.exports = function (opt) {

    var pool = createPool(opt.url, opt.connections);

    var dialect = url.parse(opt.url).protocol;
    dialect = dialect.substr(0, dialect.length - 1);
    if (dialect == 'sqlite3')
        dialect = 'sqlite';

    sql.setDialect(dialect);

    var self = {};


    function extendedTable(table) {
        var extTable = Object.create(table); // inherit everything from a regular table.

        // make query methods return extended queries.
        ['select', 'from', 'insert', 'update',
            'delete', 'create', 'drop', 'alter', 'where'].forEach(function (key) {
                extTable[key] = function () {
                    return extendedQuery(table[key].apply(table, arguments));
                }
            });


        // make as return extended tables.
        extTable.as = function () {
            return extendedTable(table.as.apply(table, arguments));
        };
        return extTable;
    }


    function extendedQuery(query) {
        var extQuery = Object.create(query);

        var self = extQuery;

        extQuery.execWithin = function (where, fn) {
            var query = self.toQuery(); // {text, params}
            if (!fn)
                return where.query(query.text, query.values);
            else
                return where.query(query.text, query.values, function (err, res) {
                    fn(err, res ? res : null);
                });
        };

        extQuery.exec = extQuery.execWithin.bind(extQuery, pool);

        extQuery.all = extQuery.exec;

        extQuery.get = function (fn) {
            return this.exec(function (err, rows) {
                return fn(err, rows && rows.length ? rows[0] : null);
            })
        };


        return extQuery;
    }


    self.define = function () {
        return extendedTable(sql.define.apply(sql, arguments));
    };


    self.close = pool.close.bind(pool);
    self.begin = pool.begin.bind(pool);
    self.query = pool.query.bind(pool);

    return self;

};
