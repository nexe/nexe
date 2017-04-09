'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _fs = require('fs');

var _util = require('./util');

var _bluebird = require('bluebird');

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const mkdirpAsync = (0, _bluebird.promisify)(_mkdirp2.default);
const statAsync = (0, _bluebird.promisify)(_fs.stat);
const unlinkAsync = (0, _bluebird.promisify)(_fs.unlink);
const readdirAsync = (0, _bluebird.promisify)(_fs.readdir);

function readDirAsync(dir) {
  return readdirAsync(dir).map(file => {
    const path = (0, _path.join)(dir, file);
    return statAsync(path).then(s => s.isDirectory() ? readDirAsync(path) : path);
  }).reduce((a, b) => a.concat(b), []);
}

function maybeReadFileContents(file) {
  return (0, _util.readFileAsync)(file, 'utf-8').catch(e => {
    if (e.code === 'ENOENT') {
      return '';
    }
    throw e;
  });
}

/**
 * The artifacts step is where source patches are committed, or written as "artifacts"
 * Steps:
 *  - A temporary directory is created in the downloaded source
 *  - On start, any files in that directory are restored into the source tree
 *  - After the patch functions have run, the temporary directory is emptied
 *  - Original versions of sources to be patched are written to the temporary directory
 *  - Finally, The patched files are written into source.
 *
 */

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const { src } = compiler;
    const temp = (0, _path.join)(src, 'nexe');
    yield mkdirpAsync(temp);
    const tmpFiles = yield readDirAsync(temp);

    yield (0, _bluebird.map)(tmpFiles, (() => {
      var _ref2 = _asyncToGenerator(function* (path) {
        return compiler.writeFileAsync(path.replace(temp, ''), (yield (0, _util.readFileAsync)(path)));
      });

      return function (_x3) {
        return _ref2.apply(this, arguments);
      };
    })());

    yield next();

    yield (0, _bluebird.map)(tmpFiles, function (x) {
      return unlinkAsync(x);
    });
    return (0, _bluebird.map)(compiler.files, (() => {
      var _ref3 = _asyncToGenerator(function* (file) {
        const sourceFile = (0, _path.join)(src, file.filename);
        const tempFile = (0, _path.join)(temp, file.filename);
        const fileContents = yield maybeReadFileContents(sourceFile);

        yield mkdirpAsync((0, _path.dirname)(tempFile));
        yield (0, _util.writeFileAsync)(tempFile, fileContents);
        yield compiler.writeFileAsync(file.filename, file.contents);
      });

      return function (_x4) {
        return _ref3.apply(this, arguments);
      };
    })());
  });

  function artifacts(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return artifacts;
})();