# Files Bucket Server

## Install
```bash
npm install files-bucket-server --save
```

## Bucket Usage
```js
var FileBucketServer = require('files-bucket-server');
var fBServer = new FileBucketServer('./path/to/files', { logsEnabled: true });

// Only allow local requests
fBServer.onlyAllowLocalRequests();

// Start server
fBServer.start().then(function (serverData) {
    console.log('Server is up at port: '+serverData.port);
});
```

## Bucket API Usage
```bash

##== Ensure file is available ==##
# Request
GET => /api/ensure-file-is-available?
    url=http://example.com/url/to/my/file &
    timeout=300 # Timeout in seconds (optional)
# Response
{ available: false } # If not available
{ available: true, url: 'http://myhost/files/myfile' } # If available


##== List files ==##
# Request
GET => /api/files
# Response
[{..]]


##== Delete file ==##
# Request
DELETE => /api/files/:filename
# Response
{ removed: true } # Removed
{ removed: false } # Error Removing

```