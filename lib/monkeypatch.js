/**
 * Copyright (c) 2013 Craig Condon
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
 
var async = require("async"),
    fs    = require("fs"),
   _log   = require("./log");

/**
 * Monkey patch a file.
 *
 * @param {string} filePath - path to file.
 * @param {function} monkeyPatched - function to process contents
 * @param {function} processor - TODO: detail what this is
 * @param {function} complete - callback
 *
 * @return undefined
 */
function _monkeypatch (filePath, monkeyPatched, processor, complete) {

  async.waterfall([

    function read (next) {
      fs.readFile(filePath, "utf8", next);
    },

    // TODO - need to parse gyp file - this is a bit hacker
    function monkeypatch (content, next) {

      if (monkeyPatched(content)) return complete();

      _log("monkey patch %s", filePath);
      processor(content, next);
    },

    function write (content, next) {
      fs.writeFile(filePath, content, "utf8", next);
    }
  ], complete);
}

// export the function for require()
module.exports = _monkeypatch;
