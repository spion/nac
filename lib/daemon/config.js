var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');
var userstore = require('../db/userstore');

var defaultCfgFile = 
    process.getuid() 
        ? path.join(userstore('nac'), 'nacd.yaml')
        : '/etc/nacd.yaml'; 


var cfgFile = process.env.NACD_CONFIG || defaultCfgFile;

try {
    var configfile = fs.readFileSync(cfgFile).toString();
    module.exports = yaml.safeLoad(configfile, {filename: cfgFile});
} catch (e) {
    console.error("warning: config file %s missing", cfgFile);
    console.error("using default configuration (no server tags)");
    module.exports = {tags: []};
}


