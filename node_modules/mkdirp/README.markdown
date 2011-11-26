mkdirp
======

Like `mkdir -p`, but in node.js!

example
=======

pow.js
------
    var mkdirp = require('mkdirp');
    
    mkdirp('/tmp/foo/bar/baz', 0755, function (err) {
        if (err) console.error(err)
        else console.log('pow!')
    });

Output
    pow!

And now /tmp/foo/bar/baz exists, huzzah!

methods
=======

var mkdirp = require('mkdirp');

mkdirp(dir, mode, cb)
---------------------

Create a new directory and any necessary subdirectories at `dir` with octal
permission string `mode`.

mkdirp.sync(dir, mode)
----------------------

Synchronously create a new directory and any necessary subdirectories at `dir`
with octal permission string `mode`.

install
=======

With [npm](http://npmjs.org) do:

    npm install mkdirp

license
=======

MIT/X11
