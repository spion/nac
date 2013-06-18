var t = require('tap');
var opts2args = require('../lib/opts2args');

t.test('normalize-opts', function(t) {
    var o = opts2args({
        s: 1,
        longer: 2,
        '-prefixed': 3,
        '--p': 4,
        '--longopt': 5,
        '_': ['more', 'arguments here']
    });
    t.deepEquals(o, [
        '-s', 1, '--longer', 2, '-prefixed', 
        3, '--p', 4, '--longopt', 5, 'more', 
        'arguments here'
    ], 'normalize-opts converts correctly');
    t.end();
});
