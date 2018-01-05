var q = require('q');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var core = require('./core')();

module.exports = function FilesBucketServer (workspacePath) {

    // Attributes
    var self = this;
    this.workspacePath = path.join(workspacePath, 'fbs-workspace');
    this.server = new core.classes.Server();

    // Methods
    var constructor = function () {
        fse.ensureDirSync(self.workspacePath);
        self.setupServerAPI();
    }
    this.setupServerAPI = function () {

        // Ensure file is available
        self.server.app.get('/api/ensure-file-is-available', function (req, res) {
            
        });
        
        // List files
        self.server.app.get('/api/files', function (req, res) {
            try {
                var entries = fs.readdirSync(self.workspacePath);
                res.status(200);
                res.json(entries.map(function (entry) {
                    core.classes.FilesNamesParser.decode(entry);
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