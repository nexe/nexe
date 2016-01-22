/**
 * Copyright (c) 2013 Craig Condon
 * Copyright (c) 2015-2016 Jared Allard
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
    spawn      = require('child_process').spawn,
    fs         = require("fs"),
    async      = require("async"),
    browserify = require('browserify'),
    builtins   = require("builtins"),
    _log     = require("./log");

/**
 * User browserify to create a "packed" file.
 *
 * @param {String} input - input file
 * @param {String} nc - node compiler dir
 * @param {Function} complete - next function to call (async)
 **/
function bundle (input, nc, complete) {
  var bundlePath = path.join(nc, "lib", "nexe.js");
  var ws = fs.createWriteStream(bundlePath);
  var proc = spawn('node', [path.join(__dirname, '../', 'node_modules/browserify/bin/cmd.js'), '--node', input ]);

  // TODO: Get path of nexe directory, and refer to it.

  proc.stdout.pipe(ws);

  proc.on('error', function(err) {
    console.error(err.toString('ascii'));
    _log('error', 'Failed to invoke browserify');
    process.exit(1);
  })

  proc.stderr.on('data', function(data) {
    console.error(data.toString('ascii'));
    _log('error', 'Browserify failed to launch');
    process.exit(1);
  });

  proc.on('close', function(code) {
    _log("Browserify finished");
  })

  ws.on('error', function(err) {
    console.log(err);
    _log('error', 'Failed to save stdout to disk');
    process.exit(1);
  })

  ws.on('close', function() {
    var source = fs.readFileSync(bundlePath, 'utf8');
    source = source.replace(/[^\x00-\x7F]/g, "");

    // write the source modified to nexe.js
    fs.writeFile(bundlePath, source, 'utf8', function(err) {
      if(err) {
        _log('error', 'failed to save source');
        process.exit(1);
      }

      complete();
    });
  });
}

module.exports = bundle;
