module.exports = function (opt) {
    var list = [];
    for (var key in opt)
        if (key == '_')
            list = list.concat(opt[key]);
        else if (key[0] == '-')
            list.push(key, opt[key]);
        else if (key.length == 1)
            list.push('-' + key, opt[key])
        else
            list.push('--' + key, opt[key]);
    return list;
};

module.exports.flatten = function (arr) {
    var list = [];
    arr.forEach(function (item) {
        if (typeof(item) == 'object')
            list = list.concat(module.exports(item));
        else
            list.push(item);
    });
    return list;
};

