var q = require('q');
var core = require('./core')();

module.exports = function FilesBucketServer (wokspacePath) {

    // Attributes
    this.wokspacePath = wokspacePath;

    // Methods
    var constructor = function () {}
    this.ensureFileIsAvailable = function (name, url) {
        var deferred = q.defer();
        
        return deferred.promise;
    }

    // Construct
    constructor();

}