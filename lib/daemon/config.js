var yaml = require('js-yaml');
var fs   = require('fs');

var cfgFile = process.env.NACD_CONFIG || '/etc/nacd.yaml';

module.exports = yaml.safeLoad(fs.readFileSync(cfgFile).toString(), {filename:cfgFile});


