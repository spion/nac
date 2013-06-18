
module.exports = function(opt) {
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

