var mdeps = require("module-deps"),
through   = require("through"),
async     = require("async"),
path      = require("path"),
fs        = require("fs"),
uglify = require("uglify-js"),
builtins = require("builtins");


function bundle (input, complete) {

  async.waterfall([

    /**
     */

    function resolveDeps (next) {


      var deps = [];


      var md = mdeps({
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


            /*var source = uglify.parse(content, {
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
          return !~builtins.indexOf(id);
        }
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
        req += dep.source + "}";

        dbuffer.push(JSON.stringify(dep.id) + ": ["+req+", "+!!dep.entry+", "+JSON.stringify(dep.deps)+"]")
      }


      buffer = ["(" + loader.toString() + ").call(null, {"+dbuffer.join(",")+"})"].toString();

      next(null, buffer);
    }
  ], complete)
}


var loader = function (deps) {

  var darr = [];
  var dir = global.require("path").dirname(process.execPath);

  for (var key in deps) {
    darr.push(deps[key]);
  }

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

  darr.forEach(initModule);

  return darr.filter(function (dep) {
    return dep[1];
  }).map(function (dep) {
    return dep.module || {};
  }).pop();
}

module.exports = bundle;
