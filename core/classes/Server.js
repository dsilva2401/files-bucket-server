var q = require('q');
var express = require('express');
var openport = require('openport');
var ip = require('ip');


module.exports = function (settings, core, shared) {
    return function Server () {

        // Attributes
        var self = this;
        this.app = express();
        this.port = null;
        this.url = null;
        this.ip = ip.address();

        // Methods
        var constructor = function () {
            
        }
        this.start = function (port) {
            var deferred = q.defer();
            // Start server handler
            var startServer = function (_port) {
                try {
                    self.app.listen(_port, function () {
                        self.port = _port;
                        self.url = 'http://'+self.ip+':'+_port;
                        deferred.resolve({
                            port: _port
                        });
                    });
                } catch (err) {
                    deferred.reject(err);
                }
            }
            // Setup port
            if (!port) {
                openport.find(function(err, port) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    startServer(port);
                });
                return deferred.promise;
            }
            startServer(port);
            return deferred.promise;
        }

        // Construct
        constructor();

    }
}