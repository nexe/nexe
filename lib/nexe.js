'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compile = exports.isNexe = exports.argv = undefined;

let compile = (() => {
  var _ref = _asyncToGenerator(function* (compilerOptions, callback) {
    const options = yield (0, _options.normalizeOptionsAsync)(compilerOptions);
    const compiler = new _compiler.NexeCompiler(options);

    compiler.log.verbose('Compiler options:' + _os.EOL + JSON.stringify(compiler.options, null, 4));

    const nexe = (0, _appBuilder.compose)(_bundle2.default, _cli2.default, _download2.default, (() => {
      var _ref2 = _asyncToGenerator(function* (_, next) {
        yield next();
        return compiler.buildAsync();
      });

      return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    })(), _artifacts2.default, _patches2.default, compiler.options.patches);
    return nexe(compiler).asCallback(callback);
  });

  return function compile(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

var _appBuilder = require('app-builder');

var _bundle = require('./bundle');

var _bundle2 = _interopRequireDefault(_bundle);

var _compiler = require('./compiler');

var _options = require('./options');

var _cli = require('./cli');

var _cli2 = _interopRequireDefault(_cli);

var _download = require('./download');

var _download2 = _interopRequireDefault(_download);

var _artifacts = require('./artifacts');

var _artifacts2 = _interopRequireDefault(_artifacts);

var _patches = require('./patches');

var _patches2 = _interopRequireDefault(_patches);

var _os = require('os');

var _bluebird = require('bluebird');

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird.Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird.Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_appBuilder.PromiseConfig.constructor = _bluebird.Promise;
(0, _bluebird.longStackTraces)();

function isNexe(callback) {
  return _bluebird.Promise.resolve(Boolean(process.__nexe)).asCallback(callback);
}

exports.argv = _options.argv;
exports.isNexe = isNexe;
exports.compile = compile;


if (require.main === module || process.__nexe) {
  compile(_options.argv).catch(e => {
    (0, _logger.error)(e.stack, () => process.exit(e.exitCode || 1));
  });
}