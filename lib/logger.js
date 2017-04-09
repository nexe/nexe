'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.verbose = exports.error = exports.info = exports.setLevel = undefined;

var _os = require('os');

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isFn(f) {
  return typeof f === 'function';
}

function logNoop(x, cb) {
  return isFn(cb) && process.nextTick(cb);
}

function safeCb(f) {
  return isFn(f) ? f : logNoop;
}

const logLevels = [['verbose', 'green'], ['info', 'blue'], ['error', 'red']];

const logger = logLevels.reduce((logMethods, info) => {
  const [level, color] = info;
  logMethods[level] = function (output, cb) {
    process.stderr.write(_chalk2.default[color](`${_os.EOL}[${level}]: ${output}`), safeCb(cb));
  };
  return logMethods;
}, {
  setLevel(level) {
    if (level === 'silent') {
      logLevels.forEach(([x]) => {
        logger[x] = logNoop;
      });
      return;
    }
    process.on('beforeExit', () => {
      process.stderr.write(_os.EOL);
    });
    if (level === 'info') {
      logger.verbose = logNoop;
    }
    return logger;
  }
});

const { info, error, verbose, setLevel } = logger;

exports.setLevel = setLevel;
exports.info = info;
exports.error = error;
exports.verbose = verbose;