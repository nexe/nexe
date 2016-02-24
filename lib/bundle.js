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

'use strict';

let browserify    = require('browserify'),
    path          = require("path"),
    spawn         = require('child_process').spawn,
    insertGlobals = require('insert-module-globals'),
    fs            = require("fs"),
    async         = require("async"),
    _log          = require("./log");

/**
 * User browserify to create a "packed" file.
 *
 * @param {string} input - input file
 * @param {string} nc - node compiler dir
 * @param {array} options - nexe options
 * @param {function} complete - next function to call (async)
 **/
function bundle(input, nc, options, complete) {
  const bundlePath = path.join(nc, "lib", "nexe.js");
  const mapfile    = options.output+'.map';
  let ws           = fs.createWriteStream(bundlePath);


  const igv = '__filename,__dirname,_process';
  let insertGlobalVars = {},
      wantedGlobalVars = igv.split(',');

  // parse insertGlobalVars.
  Object.keys(insertGlobals.vars).forEach(function (x) {
    if (wantedGlobalVars.indexOf(x) === -1) {
      insertGlobalVars[x] = undefined;
    }
  });

  let paths = [path.join(nc, 'lib')];

  if(options.browserifyPaths) {
    paths = paths.concat(options.browserifyPaths);
  }


  _log('executing browserify via API');
  let bproc = browserify([input], {
    debug: options.debug,
    commondir: false,
    paths: paths,
    builtins: false,
    insertGlobalVars: insertGlobalVars,
    detectGlobals: true,
    browserField: false
  });

  if (options.browserifyExcludes && Array.isArray(options.browserifyExcludes)) {
    for (let i = 0; i < options.browserifyExcludes.length; i++) {
      let lib = options.browserifyExcludes[i];
      _log('Excluding \'%s\' from browserify bundle', lib);
      bproc.exclude(lib);
    }
  }

  // copy the excludes code for requires for now.
  if (options.browserifyRequires && Array.isArray(options.browserifyRequires)) {
    for (let i = 0; i < options.browserifyRequires.length; i++) {
      let lib = options.browserifyRequires[i];
      let name = lib.file || lib; // for  object format.

      _log('Force including \'%s\' in browserify bundle', name);
      bproc.require(lib);
    }
  }

  if(options.debug) {
    bproc.require(require.resolve('source-map-support'))
  }

  let bprocbun = bproc.bundle() // bundle
      .pipe(ws) // pipe to file

  // error on require errors, still can't contionue. ffs browserify
  bprocbun.on('error', function(err) {
    _log('error', '[browserify] '+err);
  });

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
      if (err) {
        _log('error', 'failed to save source');
        process.exit(1);
      }

      complete();
    });
  });
}

module.exports = bundle;
