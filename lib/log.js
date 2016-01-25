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

var colors = require('colors');

/**
 * standard output, takes 3 different types.
 * log, error, and warn
 *
 * @param {any} arguments - Text to output.
 * @return undefined
 **/
function _log () {

  var args = Array.prototype.slice.call(arguments, 0),
  level = args.shift();

  if (!~["log", "error", "warn"].indexOf(level)) {
    args.unshift(level);
    level = "log";
  }

  if(level == "log") {
    args[0] = "----> " + args[0];
  } else if(level == "error") {
    args[0] = "....> " + colors.red("ERROR: ") + args[0]
  } else if(level == "warn") {
    args[0] = "....> " + colors.yellow("WARNING: ") + args[0]
  }

  console[level].apply(console, args);
}

// export the log function, for require()
module.exports = _log;
