var _ = require('lodash');

module.exports = function(tags, appconf) {
    
    var result = _.merge({}, appconf);
    var priorityTags = tags.slice().reverse();
    
    if (appconf.servers)
        priorityTags.forEach(function(tag) {
            if (appconf.servers[tag])
                _.merge(result, appconf.servers[tag])
        });

    return result;
};


