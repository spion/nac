var t = require('tap');


process.env.NACD_DATABASE = '';
process.env.NACD_CONFIG = path.join(__dirname, 'harness', 'nacd.conf');

var Daemon = require('../lib/daemon/daemon');


t.test('duration.stringify', function (t) {
    t.end();
});

t.test('duration.parse', function (t) {
    t.end();
});

t.test('stringify(parse(str)) == str', function (t) {
    t.end();
});



