var mkdirp = require('mkdirp');
var path = require('path');

process.env.NACD_DATABASE = '';
process.env.NACD_CONFIG = path.join(__dirname, 'harness', 'nacd.conf');
process.env.NACD_LOGFLUSH = 1;

var Daemon = require('../../lib/daemon/daemon');

exports.daemon = function create(cb) {
    Daemon.create(function (err, daemon) {
        if (err)
            return cb(err);
        cb(null, function createClient() {
            return Daemon.interface(process.getuid(), daemon);
        });
    });

};

exports.config = path.join(__dirname, 'config.yaml');
exports.configErr = path.join(__dirname, 'config-err.yaml');