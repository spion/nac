var path = require('path');

exports.update = exports.create = function (args) {
    var processed = args.slice();
    if (processed[1])
        processed[1] = path.resolve(process.cwd(), processed[1]);
    return processed;
};