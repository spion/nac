var tlib = require('./harness/testlib.js'),
    async = require('async');

module.exports = function(t) {
    t.test('goodapp', function(dt) {
        tlib.daemon(function(err, client) {
            var c = client();
            dt.test('create', function(t) {
                c.create('test-good', 
                    tlib.config,
                    function(err, app) {
                        t.notOk(err, 'created app error: ' + err);
                        t.equals(app.config.command, './process.js', 
                            'config file read');
                        t.end();
                    });
            });
            dt.test('create nonexistant config fails', function(t) {
                c.create('nonexistant', 'nonexistant.yaml', 
                    function(err, app){
                        t.ok(err, 'create nonexistant err: ' + err)
                        t.end()
                    })
            });

            dt.test('create duplicate fails', function(t) {
                c.create('test-good', 
                    tlib.config,
                    function(err, app) {
                        t.ok(err, 'creating duplicate fails: ' + err);
                        t.end();
                    });
            });

            dt.test('created app can be started', function(t) {
                c.start('test-good', function(err, apps) {
                    t.notOk(err, 'app start error: ' + err);
                    t.ok(apps[0].active, 'app is now active: ' 
                        + apps[0].active);
                    t.ok(apps[0].started, 'app is started: ' 
                        + apps[0].started);
                    t.end();
                })
            });
            dt.test('started app cannot be started twice', function(t) {
                c.start('test-good', function(err, apps) {
                    t.ok(err, 'app start error: ' + err);
                    t.end();
                });
            })

            dt.test('signal can be sent to app', function(t) {
                c.kill('test-good', 'SIGUSR2', function(err, app) {
                    setTimeout(function() {
                        c.logs('test-good', {tag: 'stdout', last: 1}, 
                            function(err, logs) {
                            t.equals(logs[0][0].text, 'SIGUSR2', 
                                'app received: ' + logs[0][0].text);
                            t.end();
                        })
                    }, 50);
                })
            })

            dt.test('started app can be stopped', function(t) {
                c.stop('test-good', function(err, app) {
                    t.notOk(err, 'app stop error: ' + err);
                    t.notOk(app.active, 'app inactive');
                    t.notOk(app.started, 'app process inactive');
                    t.end();
                })
            });    

            dt.test('app has logs', function(t) {
                

                setTimeout(function() {
                    function tlogs(opt, finished) {
                        c.logs('test-good', opt, function(err, logs) {
                            t.ok(logs[0].length > 0, 'had at least 1 lines in '
                                + JSON.stringify(opt));                
                            finished();
                        })
                    }
                    async.parallel([
                        function(finished) {
                            c.logs('test-good', function(err, logs) {
                                t.notOk(err, 'log request error: ' + err);
                                t.ok(logs[0].length > 3, 
                                    'had at least 3 lines in log');
                                finished();
                            });
                        }, function(finished) {
                            c.logs('test-good', {last: 2}, function(e, logs) {
                                t.equals(logs[0].length, 2, 
                                    'had exactly 2 lines in {last: 2}');
                                finished();
                            });
                        },
                        tlogs.bind(null, {tag: 'stdout'}),
                        tlogs.bind(null, {tag: 'start'}),
                        tlogs.bind(null, {tag: 'stop'}),
                        tlogs.bind(null, {tag: 'stderr'}),
                        tlogs.bind(null, {tag: 'exit'})

                    ], function(err, res){
                        t.end();
                        dt.end();
                    });

                }, 50);
                
            });
        });
    });
    
};

if (!process.env.COVER)
    module.exports(require('tap'));