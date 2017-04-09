'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const options = compiler.options.rc;
    if (!options) {
      return next();
    }

    const file = yield compiler.readFileAsync('src/res/node.rc');

    Object.keys(options).forEach(function (key) {
      let value = options[key];
      const isVar = /^[A-Z_]+$/.test(value);

      value = isVar ? value : `"${value}"`;
      file.contents.replace(new RegExp(`VALUE "${key}",*`), `VALUE "${key}", ${value}`);
    });

    return next();
  });

  function nodeRc(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return nodeRc;
})();