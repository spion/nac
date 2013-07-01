var opts2args = require('../lib/opts2args');

module.exports = function(t) {
    t.test('normalize-opts', function (t) {
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

    t.test('normalize flatten', function (t) {
        t.deepEquals(opts2args.flatten(['a', 'b', {c: 1}]), [
            'a', 'b', '-c', '1'
        ]);
        t.end();
    });
};


if (!process.env.COVER)
    module.exports(require('tap'));