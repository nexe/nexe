'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _util = require('../util');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const iconFile = compiler.options.ico;
    if (!iconFile) {
      return next();
    }
    const file = yield compiler.readFileAsync('src/res/node.ico');
    file.contents = yield (0, _util.readFileAsync)((0, _path.normalize)(iconFile));
    return next();
  });

  function ico(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return ico;
})();