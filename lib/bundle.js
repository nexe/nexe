/**
 * Copyright (c) 2013 Craig Condon
 * Copyright (c) 2015 Jared Allard
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 **/
var mdeps  = require("module-deps"),
path       = require("path"),
fs         = require("fs"),
through    = require("through"),
async      = require("async"),
browserify = require('browserify'),
builtins   = require("builtins"),
_log     = require("./log");

/**
 * User browserify to create a "packed" file.
 *
 * @param {string} input - input file
 * @param {string} nc - node compiler dir
 * @param {function} complete - next function to call (async)
 **/
function bundle (input, nc, complete) {
  var b = browserify(input, {
    builtins: false,
    commondir:false,
    detectGlobals: false,
    insertGlobals: '__filename,__dirname',
    browserField: false
  });
  var bundlePath = path.join(nc, "lib", "nexe.js");
  var ws = fs.createWriteStream(bundlePath);

  /*if(fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
  }*/

  var bfs = b.bundle(); // open the bundle stream.

  bfs.pipe(ws); // pipe it to the write stream we created earlier

  ws.on('error', function(err) {
    console.log(err);
  })

  ws.on('close', function() {
    var source = fs.readFileSync(bundlePath, 'utf8');
    source = source.replace(/[^\x00-\x7F]/g, "");
    fs.writeFileSync(bundlePath, source, 'utf8');

    complete();
  })
}

module.exports = bundle;
