var path = require('path');
var FileBucketServer = require('../');
var fBServer = new FileBucketServer(
    path.join(__dirname, './fbs-workspace'), { logsEnabled: true }
);

fBServer.onlyAllowLocalRequests();

fBServer.start(3000);