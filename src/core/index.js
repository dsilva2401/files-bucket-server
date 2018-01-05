var path = require('path');

module.exports = function () {
    var settings = {};
    var shared = {};
    var core = {};
    
    var attrs = ['services', 'classes'];
    attrs.forEach(function (attr) {
        Object.defineProperty(core, attr, {
            set: function () {},
            get: function () {
                return require('./'+attr)(settings, core, shared);
            }
        });
    });
    
    return core;
}