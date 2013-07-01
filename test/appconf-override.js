var acoverride = require('../lib/appconf-override');

module.exports = function(t) {
    t.test('appconf-override', function(t){
        var overriden = acoverride(['first', 'second'], {
            item: 1,
            servers: {
                first: {
                    item:2
                },
                second: {
                    item:3
                }
            }
        });
        t.equals(overriden.item, 2, 'highest priority tag chosen');
        t.end();
    });
};

if (!process.env.COVER)
    module.exports(require('tap'));