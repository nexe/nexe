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
var mdeps      = require("module-deps"),
browserResolve = require("browser-resolve"),
through        = require("through"),
async          = require("async"),
builtins       = require("builtins");

var _log     = require("./log");

function bundle (input, complete) {

  async.waterfall([

    /**
    * first we resolve all of the deps
     */

    function resolveDeps (next) {


      var deps = [];


      var md = mdeps({
        resolve: function (id, options, callback) {
          options.browser = "main";
          return browserResolve(id, options, callback);
        },
        xtransform: function (tr, file) {

          var buffer = [];
          console.log(tr);


          return through(write, end);

          var self = this;


          function write (chunk) {
            buffer.push(chunk.toString());
            // console.log(chunk.toString(""))
            console.log(tr);
          }

          function end() {
            var content = buffer.join("");
            // console.log(content);
            /*
            // TODO add uglify flag
            var source = uglify.parse(content, {
              strict: false
            });
            source.figure_out_scope();
            source.compute_char_frequency();
            source.mangle_names();

            // TODO - production
            content = source.print_to_string({
              ascii_only: true,
              quote_keys: true
            });*/

            this.queue(content);
            this.queue(null);
          }

        },
        filter: function (id) {
          if ([ 'nexeres', 'sys', 'readline' ].indexOf(id) > -1) { return false; }
          return !~builtins.indexOf(id);
        },
        extensions: [ '.js', '.json' ],
        ignoreMissing: true
      });

      /** event for missing packages, fixes conditional requires **/
      md.on('missing', function(id, parent) {
        _log("warn", "couldn't find require '" + id + "', errors may occur.");
      });

      md.pipe(through(function (chunk) {
        deps.push(chunk);
      }, function () {
        next(null, deps);
      }));

      md.end({ file: input })

    },

    function bundleScript (deps, next) {
      var buffer = [loader.toString()];
      var dbuffer = [];

      for (var i = deps.length; i--;) {
        var dep = deps[i];

        var req = "function (require, module, exports, __dirname) { \n"
        if (dep.id.toLowerCase().indexOf(".json", dep.id.length - 5) !== -1) {
          //this is the result of require("someFile.json"), so we need to export it from the function
          req += "module.exports = "
        }
        if ((/^\#\!/).test(dep.source)) {
          dep.source = '//' + dep.source;
        }

        req += dep.source + "\n}";

        dbuffer.push(JSON.stringify(dep.id) + ": ["+req+", "+!!dep.entry+", "+JSON.stringify(dep.deps)+"]")
      }

      buffer = ["(" + loader.toString() + ").call(null, {"+dbuffer.join(",")+"}," + JSON.stringify(deps[deps.length-1].id) + ")"].toString();

      next(null, buffer);
    }
  ], complete)
}


var loader = function (deps, key) {
  var pathModule = global.require("path");
  var darr = [];
  var dir = pathModule.dirname(process.execPath);

  process.argv[1] = key;

  var argv3 = process.argv[3];
  if (argv3 && /^(?!\/|\w+:)/.test(argv3)) {
    argv3 = pathModule.relative(pathModule.dirname(process.execPath), argv3);
    argv3 = pathModule.resolve(pathModule.dirname(key), argv3);
  }
  if (process.argv[2] == "--child_process" && deps[argv3]) {
    //we've been forked and should run the module specified by argv3[3] instead of the start up module
    key = argv3;
    process.argv.splice(2, 2); //restore the argv to [0] = executable, [1] = nexejs
  }
  else if (process.argv[2] == "--child_process") {
    //fork called, but for a module not bundled.
    argv3 = process.argv[3];
    process.argv.splice(1, 2); //restore the argv to [0] = executable, [1] = script
    global.require(argv3);
    return;
  }
  darr.push(deps[key]); //start up module.

  function initModule (dep) {
    if (dep.module) return dep.module.exports;
    dep.module = { exports: {} };

    dep[0](function (path) {
      var rdep = deps[dep[2][path]];
      var exports = rdep ? rdep.module ? rdep.module.exports : initModule(rdep) : global.require(path);
      return exports;
    }, dep.module, dep.module.exports, dir);

    return dep.module.exports;
  }

  //run the startup module
  darr.forEach(initModule);

  return darr.filter(function (dep) {
    return dep[1];
  }).map(function (dep) {
    return dep.module || {};
  }).pop();
}

module.exports = bundle;
