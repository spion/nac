var fs = require('fs');
var path = require('path');
var tap = require('tap');

process.env.COVER = true;

fs.readdirSync(path.join(__dirname, '..'))
    .filter(function(f) { return f.indexOf('.js') > 0; })
    .forEach(function (f) {
        var test = require('../' + f);
        test(tap); 
        tap.test(function(t) {
            t.ok(true, 'All tests run');
            setTimeout(process.exit, 1000)
            t.end();

        })       
    });
