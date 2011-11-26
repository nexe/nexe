findit
======

Recursively walk directory trees. Think `/usr/bin/find`.

example time!
=============

callback style
--------------

````javascript
require('findit').find(__dirname, function (file) {
    console.log(file);
})
````

emitter style
-------------

````javascript
var finder = require('findit').find(__dirname);

finder.on('directory', function (dir) {
    console.log(dir + '/');
});

finder.on('file', function (file) {
    console.log(file);
});
````

synchronous
-----------

````javascript
var files = require('findit').sync(__dirname);
    console.dir(files);
````

methods
=======

find(basedir)
-------------
find(basedir, cb)
-----------------

Do an asynchronous recursive walk starting at `basedir`.
Optionally supply a callback that will get the same arguments as the path event
documented below in "events".

If `basedir` is actually a non-directory regular file, findit emits a single
"file" event for it then emits "end".

Findit uses `fs.stat()` so symlinks are traversed automatically. Findit won't
traverse an inode that it has seen before so directories can have symlink cycles
and findit won't blow up.

Returns an EventEmitter. See "events".

sync(basedir, cb)
-----------------

Return an array of files and directories from a synchronous recursive walk
starting at `basedir`.

An optional callback `cb` will get called with `cb(file, stat)` if specified.

events
======

file: [ file, stat ]
--------------------

Emitted for just files which are not directories.

directory : [ directory, stat ]
-------------------------------

Emitted for directories.

path : [ file, stat ]
---------------------

Emitted for both files and directories.

end
---

Emitted when the recursive walk is done.
