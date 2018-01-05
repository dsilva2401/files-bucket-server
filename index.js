var q = require('q');
var path = require('path');
var express = require('express');
var fs = require('fs');
var download = require('download');
var downloadFile = require('download-file')
var fse = require('fs-extra');
var core = require('./core')();

module.exports = function FilesBucketServer (workspacePath) {

    // Attributes
    var self = this;
    this.workspacePath = workspacePath;
    this.server = new core.classes.Server();

    // Methods
    var constructor = function () {
        fse.ensureDirSync(self.workspacePath);
        self.setupServerAPI();
        self.setupServerFilesStatics();
    }
    var parseEntry = function (rawEntryName) {
        var e = {
            name: rawEntryName.split('_')[0],
            available: !!!rawEntryName.split('_')[1],
        }
        if (e.available) {
            e.url = self.server.url+'/files/'+rawEntryName
        }
        return e;
    }
    this.setupServerFilesStatics = function () {
        self.server.app.use('/files', express.static(self.workspacePath));
    }
    this.setupServerAPI = function () {

        // Ensure file is available
        self.server.app.get('/api/ensure-file-is-available', function (req, res) {
            // Validation
            var requiredQueryParams = {
                name: /[a-zA-Z0-9]+/,
                // url: /.*/,
            }
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
    this.start = function (number) {
        return this.server.start(number);
    }

    // Construct
    constructor();

}