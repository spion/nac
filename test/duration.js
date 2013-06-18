var t = require('tap');

var duration = require('../lib/duration');

t.test('duration', function(t) {
    var ms = 12.51 * 24 * 60 * 60 * 1000;
    t.equals(duration(ms), '12d 12h 14m');
    t.end();
});


