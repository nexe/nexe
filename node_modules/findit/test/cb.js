var assert = require('assert');
var path = require('path');
var find = require('../');

exports.cbSync = function () {
    var files = [];
    var dirs = [];
    find.sync(__dirname + '/foo', function (file, stat) {
        if (stat.isDirectory()) dirs.push(file)
        else files.push(file)
    });
    
    function equal (xs, ys) {
        assert.deepEqual(
            xs.sort().map(function (x) {
                return path.relative(__dirname + '/foo', x)
            }),
            ys.sort()
        );
    }
    
    equal(dirs, [ 'a', 'a/b', 'a/b/c' ]);
    equal(files, [ 'x', 'a/y', 'a/b/z', 'a/b/c/w' ]);
};
