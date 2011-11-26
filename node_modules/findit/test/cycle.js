var assert = require('assert');
var findit = require('../');
var Hash = require('hashish');

exports.cycle = function () {
    var find = findit.find(__dirname + '/cycle');
    var found = { directory : [], file : [], path : [] };
    
    find.on('directory', function (dir) {
        found.directory.push(dir);
    });
    
    find.on('file', function (file) {
        found.file.push(file);
    });
    
    find.on('path', function (file) {
        found.path.push(file);
    });
    
    var to = setTimeout(function () {
        assert.fail('never ended');
    }, 5000);
    
    find.on('end', function () {
        clearTimeout(to);
        var dirs = Hash.map({
            directory : [ 'meep', 'meep/moop' ],
            file : [],
            path : [ 'meep', 'meep/moop' ]
        }, function (x) {
            return x.map(function (dir) {
                return __dirname + '/cycle/' + dir
            })
        });
        
        assert.deepEqual(dirs.directory, found.directory);
        assert.deepEqual(dirs.file, found.file);
        assert.deepEqual(dirs.path, found.path);
    });
};
