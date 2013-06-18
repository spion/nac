var acoverride = require('../lib/daemon/appconf-override');
var t = require('tap');


t.test('appconf-override', function(t) {
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
