'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NexeCompiler = undefined;

var _path = require('path');

var _bluebird = require('bluebird');

var _fs = require('fs');

var _child_process = require('child_process');

var _logger = require('./logger');

var logger = _interopRequireWildcard(_logger);

var _util = require('./util');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird.Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird.Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const isWindows = process.platform === 'win32';
const isBsd = Boolean(~process.platform.indexOf('bsd'));
const make = isWindows ? 'vcbuild.bat' : isBsd ? 'gmake' : 'make';
const configure = isWindows ? 'configure' : './configure';

class NexeCompiler {
  constructor(options) {
    var _this = this;

    this.options = options;
    logger.setLevel(options.loglevel);
    this.log = logger;
    this.python = options.python;
    this.configure = options.configure;
    this.make = isWindows ? options.vcBuild : options.make;
    this.src = (0, _path.join)(options.temp, options.version);
    this.env = Object.assign({}, process.env);
    this.files = [];

    this.readFileAsync = (() => {
      var _ref = _asyncToGenerator(function* (file) {
        let cachedFile = _this.files.find(function (x) {
          return (0, _path.normalize)(x.filename) === (0, _path.normalize)(file);
        });
        if (!cachedFile) {
          cachedFile = {
            filename: file,
            contents: yield (0, _util.readFileAsync)((0, _path.join)(_this.src, file), 'utf-8').catch({ code: 'ENOENT' }, function () {
              return '';
            })
          };
          _this.files.push(cachedFile);
        }
        return cachedFile;
      });

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    })();
    this.writeFileAsync = (file, contents) => (0, _util.writeFileAsync)((0, _path.join)(this.src, file), contents);
  }

  set python(pythonPath) {
    if (!pythonPath) {
      return;
    }
    if (isWindows) {
      this.env.PATH = this.env.PATH + ';"' + (0, _util.dequote)((0, _path.normalize)(pythonPath)) + '"';
    } else {
      this.env.PYTHON = pythonPath;
    }
  }

  get _deliverableLocation() {
    return isWindows ? (0, _path.join)(this.src, 'Release', 'node.exe') : (0, _path.join)(this.src, 'out', 'Release', 'node');
  }

  _runBuildCommandAsync(command, args) {
    return new _bluebird.Promise((resolve, reject) => {
      (0, _child_process.spawn)(command, args, {
        cwd: this.src,
        env: this.env,
        stdio: 'ignore'
      }).once('error', reject).once('close', resolve);
    });
  }

  _configureAsync() {
    return this._runBuildCommandAsync(this.env.PYTHON || 'python', [configure, ...this.configure]);
  }

  buildAsync() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      yield _this2._configureAsync();
      return _this2._runBuildCommandAsync(make, _this2.make);
    })();
  }

  getDeliverableAsync() {
    return _bluebird.Promise.resolve((0, _fs.createReadStream)(this._deliverableLocation));
  }
}
exports.NexeCompiler = NexeCompiler;