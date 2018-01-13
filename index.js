var q = require('q');
var path = require('path');
var express = require('express');
var morgan = require('morgan');
var base64 = require('base-64');
var requestIp = require('request-ip');
var fs = require('fs');
var download = require('download');
var downloadFile = require('download-file')
var fse = require('fs-extra');
var core = require('./core')();

module.exports = function FilesBucketServer (workspacePath, options) {

    // Attributes
    var self = this;
    this.workspacePath = workspacePath;
    this.server = new core.classes.Server();
    this.onlyLocalRequestsAllowed = false;

    // Methods
    var constructor = function () {
        fse.ensureDirSync(self.workspacePath);
        setupSecurityMiddleware();
        self.setupServerAPI();
        self.setupServerFilesStatics();
        self.startGarbageCollector();
    }
    var parseEntry = function (rawEntryName) {
        var e = {
            name: rawEntryName.split('_')[0],
            available: !!!rawEntryName.split('_')[1],
        }
        try {
            e.source = base64.decode(e.name);
        } catch (err) {}
        if (e.available) {
            if (self.onlyLocalRequestsAllowed) {
                e.url = 'http://localhost:'+self.server.port+'/files/'+rawEntryName
            } else {
                e.url = self.server.url+'/files/'+rawEntryName
            }
        }
        return e;
    }
    var setupSecurityMiddleware = function () {
        self.server.app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
        self.server.app.use(requestIp.mw());
        if (options && options.logsEnabled) {
            self.server.app.use(morgan('dev'));
        }
        self.server.app.all('*', function (req, res, next) {
            if (!self.onlyLocalRequestsAllowed) {
                next();
                return;
            }
            if (
                req.clientIp != 'localhost' &&
                req.clientIp != '127.0.0.1' &&
                req.clientIp != '::1' &&
                req.clientIp != '::ffff:127.0.0.1' &&
                req.clientIp != self.server.ip
            ) {
                res.status(401);
                res.send('Outside requests are not allowed');
                res.end();
                return;
            }
            next();
        });
    }
    this.setupServerFilesStatics = function () {
        self.server.app.use('/files', express.static(self.workspacePath));
    }
    this.onlyAllowLocalRequests = function () {
        this.onlyLocalRequestsAllowed = true;
    }
    this.startGarbageCollector = function () {
        setInterval(function () {
            try {
                var entriesToWatch = fs.readdirSync(
                    self.workspacePath
                ).filter(function (e) {
                    return !!e.split('_')[1];
                });
                // Remove invalid
                entriesToWatch.forEach(function (e) {
                    var entryPath = path.join(self.workspacePath, e);
                    if (e.split('_').length != 3) {
                        fse.remove(entryPath);
                        return;
                    }
                });
                entriesToWatch = entriesToWatch.filter(function (e) {
                    if (e.split('_').length != 3) {
                        return false;
                    }
                    return true;
                });
                // Remove expired
                entriesToWatch.forEach(function (e) {
                    var entryPath = path.join(self.workspacePath, e);
                    var timestamp = parseInt(e.split('_')[1]);
                    var timeoutInSeconds = parseInt(e.split('_')[2]);
                    if ((Date.now() - timestamp)/1000 > timeoutInSeconds) {
                        fse.remove(entryPath);
                    }
                });
            } catch (err) {}
        }, 6000);
    }
    this.setupServerAPI = function () {

        // Test service
        self.server.app.get('/test', function (req, res) {
            res.status(200);
            res.send('Ok');
            res.end();
        })

        // Ensure file is available
        self.server.app.get('/api/ensure-file-is-available', function (req, res) {
            // Validation
            var requiredQueryParams = {
                // name: /[a-zA-Z0-9]+/,
                // url: /.*/,
            }
            req.query.name = base64.encode(req.query.url);
            for (var k in requiredQueryParams) {
                if (
                    !req.query[k] ||
                    !req.query[k].match(requiredQueryParams[k])
                ) {
                    res.status(404);
                    res.send('Invalid params, missing query param: '+k);
                    res.end();
                    return;
                }
            }
            // Verify if downloaded
            try {
                var entries = fs.readdirSync(self.workspacePath);
                var parsedEntries = entries.map(function (entry) {
                    return parseEntry(entry);
                });
                
                // Found
                var item = parsedEntries.filter(function (e) {
                    return e.name == req.query.name;
                })[0];
                if (item) {
                    res.status(200);
                    res.json(item);
                    res.end();
                    return;
                }

                // Not found
                var timeout = parseInt(req.query.timeout || '0') || 60;
                /*download(req.query.url).then(function (data) {
                    fs.writeFileSync(
                        path.join(self.workspacePath, req.query.name), data
                    );
                });*/
                var fname = req.query.name+'_'+Date.now()+'_'+timeout;
                downloadFile(req.query.url, {
                    filename: fname,
                    directory: self.workspacePath
                }, function (err) {
                    if (err) {
                        try {
                            fse.removeSync(
                                path.join(self.workspacePath, fname)
                            )
                        } catch (err) {}
                        return;
                    }
                    try {
                        fse.renameSync(
                            path.join(self.workspacePath, fname),
                            path.join(self.workspacePath, req.query.name)
                        );
                    } catch (err) {}
                })
                res.status(200);
                res.json({
                    name: req.query.name,
                    available: false
                });
                res.end();

            } catch (err) {
                res.status(500);
                res.send(err);
                res.end();
            }
        });
        
        // List files
        self.server.app.get('/api/files', function (req, res) {
            try {
                var entries = fs.readdirSync(self.workspacePath);
                res.status(200);
                res.json(entries.map(function (entry) {
                    return parseEntry(entry);
                }));
                res.end();
            } catch (err) {
                res.status(500);
                res.send(err);
                res.end();
            }
        });
        
        // Delete file
        self.server.app.delete('/api/files/:filename', function (req, res) {
            var filePath = path.join(self.workspacePath, req.params.filename);
            try {
                if (!fs.existsSync(filePath)) {
                    res.status(404);
                    res.send('Not found');
                    res.end();
                    return;
                }
                fse.removeSync(filePath);
                res.status(200);
                res.send('Deleted!');
                res.end();
            } catch (err) {
                res.status(500);
                res.send(err);
                res.end();
            }
        });

    }
    this.start = function (port) {
        return this.server.start(port);
    }

    // Construct
    constructor();

}