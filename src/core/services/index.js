var fs = require('fs');

module.exports = function (settings, core, shared) {
    var entries = fs.readdirSync(__dirname);
    var entriesMap = {};
    entries.filter(function (entry) {
        return !({ '.DS_Store': 1, 'index.js': 1 })[entry];
    }).map(function (entry) {
        return entry.split('.')[0];
    }).forEach(function (entry) {
        Object.defineProperty(entriesMap, entry, {
            set: function () {},
            get: function () {
                return require('./'+entry)(settings, core, shared);
            }
        });
    });
    return entriesMap;
}