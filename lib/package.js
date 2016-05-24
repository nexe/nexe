/**
 * Package a project into a single file that
 * can be executed by node.js
 *
 * @name Package
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

'use strict';

const async         = require('async'),
      path          = require('path'),
      fs            = require('fs'),
      browserify    = require('browserify'),
      insertGlobals = require('insert-module-globals');

let methods = {};


/**
 * Use browserify.
 *
 * @param {String} input   - input file.
 * @param {Function} done  - callback.
 * @param {WriteStream} ws - writestream.
 *
 * @returns {Boolean} success
 **/
methods.browserify = (input, done, ws) => {
  // bundle and global vars.
  const igv            = '__filename,__dirname,_process';

  let insertGlobalVars = {},
      wantedGlobalVars = igv.split(',');

  // parse insertGlobalVars.
  Object.keys(insertGlobals.vars).forEach(function (x) {
    if (wantedGlobalVars.indexOf(x) === -1) {
      insertGlobalVars[x] = undefined;
    }
  });

  console.log('input is', input);

  console.log('executing browserify via API');
  let bproc = browserify([input], {
    commondir: false,
    paths: '',
    builtins: false,
    insertGlobalVars: insertGlobalVars,
    detectGlobals: true,
    browserField: false
  });

  let bprocbun = bproc.bundle() // bundle
      .pipe(ws) // pipe to file

  // error on require errors, still can't contionue. ffs browserify
  bprocbun.on('error', function(err) {
    console.log('error', '[browserify] '+err);
  });

  ws.on('error', function(err) {
    console.log(err);
    console.log('error', 'Failed to save stdout to disk');
    process.exit(1);
  })

  ws.on('close', function() {
    return done(false, null);

    // let source = fs.readFileSync(bundlePath, 'utf8');
    // source = source.replace(/[^\x00-\x7F]/g, '');

    // write the source modified to nexe.js
    /* fs.writeFile(bundlePath, source, 'utf8', function(err) {
      if (err) {
        console.log('error', 'failed to save source');
        return done(err);
      }

      return done(false);
    }); */
  });
}

/**
 * Use jspm.
 *
 * @param {String} input  - input file.
 * @param {String} output - output file.
 * @returns {Boolean} success
 **/
methods.jspm = (input, output) => {

}

/**
 * Use webpack.
 *
 * @param {String} input  - input file.
 * @returns {String} buffer - files
 **/
methods.webpack = (input) => {

}

/**
 * Old NEXE method of packaging.
 *
 * @param {String} input  - input file.
 * @param {Function} done - what to do when done.
 * @returns {String} new file contents. Should be a stream later on.
 **/
methods.nexe = (input, done) => {
  const mdeps    = require('module-deps'),
        through  = require('through'),
        builtins = require('builtins');

  /**
   * Loader function
   *
   * @param {String} deps - tbd
   * @param {String} key - tbd
   * @returns {Array} ?
   **/
  const loader = function (deps, key) {
    var pathModule = global.require('path');
    var darr = [];
    var dir = global.require('path').dirname(process.execPath);

    var argv3 = process.argv[3];
    if (argv3) {
      argv3 = pathModule.relative(pathModule.dirname(process.execPath), argv3);
      argv3 = pathModule.resolve(pathModule.dirname(key), argv3);
    }
    if (process.argv[2] == '--child_process' && deps[argv3]) {
      //we've been forked and should run the module specified by argv3[3] instead of the start up module
      key = argv3;
      process.argv.splice(2, 2); //restore the argv to [0] = executable, [1] = nexejs
    }
    else if (process.argv[2] == '--child_process') {
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

  const bundle = (input, complete) => {

    async.waterfall([
      /**
      * first we resolve all of the deps
       */
      function resolveDeps (next) {
        var deps = [];
        var md = mdeps({
          xtransform: function (tr, file) {
            let buffer = [];
            let self = this;

            console.log(tr);

            return through(write, end);

            function write(chunk) {
              buffer.push(chunk.toString());
              console.log(tr);
            }

            function end() {
              var content = buffer.join('');

              this.queue(content);
              this.queue(null);
            }

          },
          filter: function (id) {
            if ([ 'nexeres', 'sys', 'readline' ].indexOf(id) > -1) {
              return false;
            }

            return !~builtins.indexOf(id);
          },
          extensions: [ '.js', '.json' ],
          ignoreMissing: true
        });

        /** event for missing packages, fixes conditional requires **/
        md.on('missing', id => {
          console.warn("couldn't find require '" + id + "', errors may occur.");
        });

        md.pipe(through(function (chunk) {
          deps.push(chunk);
        }, function () {
          return next(null, deps);
        }));

        md.end({ file: input })
      },

      function bundleScript(deps, next) {
        var buffer = [loader.toString()];
        var dbuffer = [];

        let header = [
          '// generated by nexe\n',
          '// using nexe method\n',
          'global.require = require;\n',
          '\n'
        ]

        header = header.toString().replace(/\,/g, '');

        deps.forEach(dep => {
          let req = 'function (require, module, exports, __dirname) { \n';

          if (dep.id.toLowerCase().indexOf('.json', dep.id.length - 5) !== -1) {
            // this is the result of require("someFile.json"), so we need to export it from the function
            req += 'module.exports = ';
          }

          if ((/^\#\!/).test(dep.source)) {
            dep.source = '//' + dep.source;
          }

          req += dep.source + '}';

          dbuffer.push(JSON.stringify(dep.id) + ': ['+req+', '+!!dep.entry+', '+JSON.stringify(dep.deps)+']')
        });

        buffer = [
          header+'(' + loader.toString() + ').call(null, {'+dbuffer.join(',')+'},' + JSON.stringify(deps[deps.length-1].id) + ')'
        ].toString();

        return next(null, buffer);
      }
    ], complete);
  }

  // instance the bundler.
  return bundle(input, done);
}


module.exports = class Package {
  constructor() {

  }

  /**
   * Bundle a Node.js Project into a Single file using a bundle method.
   *
   * @param {String} input  - input file.
   * @param {String} output - output file.
   * @param {String} method - method
   * @param {Function} cb   - callback.
   *
   * @returns {Promise} Promise Object.
   **/
  bundle(input, output, method, cb) {
    method = method || 'nexe';

    if(!methods[method]) {
      return cb('Method not found...')
    }

    console.log('WS:', output);
    let ws = fs.createWriteStream(output);

    async.waterfall([
      /**
       * Utilize the method.
       **/
      (next) => {
        methods[method](input, (err, contents) => {
          return next(err, contents);
        }, ws);
      },

      /**
       * Save the contents.
       **/
      (contents, next) => {
        if(contents === null) {
          // used write socket.
          return next();
        }

        fs.writeFile(output, contents, err => {
          if(err) {
            return next(err);
          }

          return next(false);
        });
      }
    ], err => {
      return cb(err);
    });
  }
}
