'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _bluebird = require('bluebird');

var _fs = require('fs');

var _util = require('./util');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird.Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird.Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const isWindows = process.platform === 'win32';

function getStdIn() {
  return new _bluebird.Promise(resolve => {
    const bundle = [];
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', x => bundle.push(x));
    process.stdin.once('end', () => resolve((0, _util.dequote)(Buffer.concat(bundle).toString())));
    process.stdin.resume();
  });
}

/**
 * The "cli" step detects whether the process is in a tty. If it is then the input is read into memory.
 * Otherwise, it is buffered from stdin. If no input options are passed in the tty, the package.json#main file is used.
 * After all the build steps have run, the output (the executable) is written to a file or piped to stdout.
 *
 * Configuration:
 *   - compiler.options.input - file path to the input bundle.
 *     - fallbacks: stdin, package.json#main
 *   - compiler.options.output - file path to the output executable.
 *     - fallbacks: stdout, nexe_ + epoch + ext
 *
 * @param {*} compiler
 * @param {*} next
 */

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const input = compiler.options.input;
    const bundled = Boolean(compiler.input);

    if (bundled) {
      yield next();
    } else if (!input && !process.stdin.isTTY) {
      compiler.log.verbose('Buffering stdin as main module...');
      compiler.input = yield getStdIn();
    } else if (input) {
      compiler.log.verbose('Reading input as main module: ' + input);
      compiler.input = yield (0, _util.readFileAsync)((0, _path.normalize)(input));
    } else if (!compiler.options.empty) {
      compiler.log.verbose('Resolving cwd as main module...');
      compiler.input = yield (0, _util.readFileAsync)(require.resolve(process.cwd()));
    }

    if (!bundled) {
      yield next();
    }

    const deliverable = yield compiler.getDeliverableAsync();

    return new _bluebird.Promise(function (resolve, reject) {
      deliverable.once('error', reject);

      if (!compiler.options.output && !process.stdout.isTTY) {
        compiler.log.verbose('Writing result to stdout...');
        deliverable.pipe(process.stdout).once('error', reject);
        resolve();
      } else {
        compiler.log.verbose('Writing result to file...');
        const output = compiler.options.output || `${compiler.options.name}${isWindows ? '.exe' : ''}`;
        deliverable.pipe((0, _fs.createWriteStream)((0, _path.normalize)(output))).once('error', reject).once('close', function (e) {
          if (e) {
            reject(e);
          } else {
            resolve(compiler.log.info('Executable written: ' + output));
          }
        });
      }
    });
  });

  function cli(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return cli;
})();