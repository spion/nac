module.exports = function duration(ms) {
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

