var path = require('path');
var FileBucketServer = require('../');
var fBServer = new FileBucketServer(path.join(__dirname, './'));

fBServer.start(3000);