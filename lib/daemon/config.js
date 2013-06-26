var yaml = require('js-yaml');
var fs = require('fs');

var cfgFile = process.env.NACD_CONFIG || '/etc/nacd.yaml';

try {
    var configfile = fs.readFileSync(cfgFile).toString();
} catch (e) {
    console.error("warning: config file /etc/nacd.yaml missing");
    console.error("using default configuration (no server tags)");
}

if (configfile)
    module.exports = yaml.safeLoad(configfile, {filename: cfgFile});
else module.exports = {tags: []};



