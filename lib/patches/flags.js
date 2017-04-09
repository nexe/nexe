'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const nodeflags = compiler.options.flags;
    if (!nodeflags.length) {
      return next();
    }

    const nodegyp = yield compiler.readFileAsync('node.gyp');

    nodegyp.contents = nodegyp.contents.replace("'node_v8_options%': ''", `'node_v8_options%': '${nodeflags.join(' ')}'`);

    return next();
  });

  function flags(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return flags;
})();