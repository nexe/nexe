'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* ({ files, readFileAsync }, next) {
    yield next();

    const nodegyp = yield readFileAsync('node.gyp');
    const nodeGypMarker = "'lib/fs.js',";

    nodegyp.contents = nodegyp.contents.replace(nodeGypMarker, `
      ${nodeGypMarker}
      ${files.filter(function (x) {
      return x.filename.startsWith('lib');
    }).map(function (x) {
      return `'${x.filename}'`;
    }).toString()},
    `.trim());
  });

  function nodeGyp(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return nodeGyp;
})();