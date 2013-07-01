var t = require('tap');

var duration = require('../lib/duration');

var ms = 12 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000 + 14 * 60 * 1000;

module.exports = function(t) {
    t.test('duration.stringify', function (t) {
        t.equals(duration.stringify(ms), '12d 12h 14m');
        t.end();
    });

    t.test('duration.parse', function (t) {
        t.equals(duration.parse('12d12h14m'), ms);
        t.end();
    });

    t.test('stringify(parse(str)) == str', function (t) {
        t.equals(duration.stringify(duration.parse('12d12h14m')), 
            '12d 12h 14m');
        t.end();
    });
};

if (!process.env.COVER)
    module.exports(require('tap'));


