exports.stringify = function duration(ms) {
    var days = ms / 1000 / 3600 / 24;    
    var daysf = Math.floor(days);
    var hours = (days - daysf) * 24;
    var hoursf = Math.floor(hours);
    var mins = Math.round((hours - hoursf) * 60);

    return [
        daysf.toFixed(0), 'd ', 
        hoursf.toFixed(0),'h ', 
        mins.toFixed(0), 'm'].join('');
};


var multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
};


exports.parse = function(str) {
    var dur = 0, segment;
    while (segment = parseFloat(str)) {
        str = str.replace(segment, '');
        var unit = str[0];
        dur += multipliers[unit] * segment;
        str = str.slice(1);
    }
    return dur;
};

