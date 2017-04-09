'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const mainFile = yield compiler.readFileAsync('lib/_third_party_main.js');
    mainFile.contents = `
    Object.defineProperty(process, '__nexe', {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false
    });
    require("${compiler.options.name}");
    `.trim();

    if (compiler.options.empty === true) {
      compiler.options.resources.length = 0;
      //eslint-disable-next-line
      compiler.input = 'console.log(`nexe-${process.platform}-${process.arch}-${process.version}`)';
      return next();
    }

    return next();
  });

  function main(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return main;
})();