var yaml = require('js-yaml');

var cfgFile = process.env.NACD_CONFIG || '/etc/nacd.conf';

module.exports = yaml.safeLoad(fs.readFileSync(cfgFile).toString(), {filename:cfgFile});


