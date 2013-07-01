var tlib = require('./harness/testlib.js'),
    async = require('async');

module.exports = function(t) {
    t.test('badapp', function(dt) {
        tlib.daemon(function(err, client) {
            var c = client();
            dt.test('create', function(t) {
                c.create('test-bad', 
                    tlib.configErr,
                    function(err, app) {
                        t.notOk(err, 'created app error: ' + err);
                        t.equals(app.config.command, './process.js', 
                            'config file read');
                        t.end();
                    });
            });
           
            dt.test('create duplicate fails', function(t) {
                c.create('test-bad', 
                    tlib.config,
                    function(err, app) {
                        t.ok(err, 'creating duplicate fails: ' + err);
                        t.end();
                    });
            });

            dt.test('created app can be active but not started', function(t) {
                c.start('test-bad', function(err, apps) {
                    t.notOk(err, 'app start error: ' + err);
                    t.ok(apps[0].active, 'app is now active: ' + apps[0].active);
                    t.notOk(apps[0].started, 'app is started: ' + apps[0].started);
                    t.end();
                })
            });
            dt.test('started app cannot be started twice', function(t) {
                c.start('test-bad', function(err, apps) {
                    t.ok(err, 'app start error: ' + err);
                    t.end();
                });
            })
            dt.test('started app can be stopped', function(t) {
                c.stop('test-bad', function(err, apps) {
                    t.notOk(err, 'app stop error: ' + err);
                    t.notOk(apps[0].active, 'app inactive');
                    t.notOk(apps[0].started, 'app process inactive');
                    // console.log("Final app", apps[0]);
                    // apps[0].process.kill('SIGKILL');
                    t.end();
                })
            });    

            dt.test('app has logs', function(t) {
                t.plan(6);
                setTimeout(function() {
                    function tlogs(opt, cb) {
                        c.logs('test-bad', opt, function(err, logs) {
                            t.ok(logs[0].length > 0, 'had at least 1 lines in ' 
                                + JSON.stringify(opt));     
                            cb();           
                        })
                    }
                    async.parallel([
                        function(finish) {
                            c.logs('test-bad', function(err, logs) {
                                t.notOk(err, 'log request error: ' + err);
                                t.ok(logs[0].length > 3, 'had at least 3 lines in log');                
                                finish();
                            });    
                        },
                        tlogs.bind(null, {tag: 'start'}),
                        tlogs.bind(null, {tag: 'stop'}),
                        tlogs.bind(null, {tag: 'stderr'}),
                        tlogs.bind(null, {tag: 'respawn'})
                    ], function() {
                        t.end();
                        dt.end();
                        //TODO: Figure out why this is necessary
                        if (!process.env.COVER) 
                            setTimeout(process.exit, 1);
                    });
                    
                    
                }, 50);
            });

        });
    });
};

if (!process.env.COVER)
    module.exports(require('tap'));