'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (compiler, next) {
    const snapshotFile = compiler.options.snapshot;

    if (!snapshotFile) {
      return next();
    }

    const file = yield compiler.readFileAsync('configure');
    file.contents = file.contents.replace('def configure_v8(o):', `def configure_v8(o):\n  o['variables']['embed_script'] = '${snapshotFile}'\n  o['variables']['warmup_script'] = '${snapshotFile}'`);
    return next();
  });

  function snapshot(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return snapshot;
})();