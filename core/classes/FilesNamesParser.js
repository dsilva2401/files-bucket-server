var q = require('q');
var express = require('express');
var openport = require('openport');


module.exports = function (settings, core, shared) {
    function FilesNamesParser () {}
    
    FilesNamesParser.encode = function (name, timestamp, timeout) {
        return '';
    }
    
    FilesNamesParser.decode = function (rawName) {
        return {}
    }

    return FilesNamesParser;
}