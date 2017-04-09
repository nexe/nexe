'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    yield next();

    const filename = 'lib/' + compiler.options.name + '.js';
    const file = yield compiler.readFileAsync(filename);
    const header = '/' + '*'.repeat(19) + 'nexe_';
    const end = '_' + '*'.repeat(19) + '/';
    const padding = Array(compiler.options.padding * 1000000).fill('*').join('');

    if (!padding) {
      file.contents = compiler.input;
      return;
    }

    file.contents = [compiler.input, '/', padding, '/'].join('');

    file.contents = header + _buffer.Buffer.byteLength(file.contents) + end + file.contents;
  });

  function content(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return content;
})();