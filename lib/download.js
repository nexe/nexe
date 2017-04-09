'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = download;

var _zlib = require('zlib');

var _tar = require('tar');

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _bluebird = require('bluebird');

var _fs = require('fs');

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const statAsync = (0, _bluebird.promisify)(_fs.stat);
const rimrafAsync = (0, _bluebird.promisify)(_rimraf2.default);

function progress(req, log, precision = 10) {
  const logged = {};
  let length = 0;
  let total = 1;

  return req.on('response', res => {
    total = res.headers['content-length'];
  }).on('data', chunk => {
    length += chunk.length;
    const percentComplete = +(length / total * 100).toFixed();
    if (percentComplete % precision === 0 && !logged[percentComplete]) {
      logged[percentComplete] = true;
      log(percentComplete);
    }
  });
}

function fetchNodeSource(path, url, log) {
  log.info('Downloading Node: ' + url);
  return new _bluebird.Promise((resolve, reject) => {
    progress(_request2.default.get(url), pc => {
      log.verbose(`Downloading Node: ${pc}%...`);
      if (pc === 100) {
        log.info('Extracting Node...');
      }
    }).on('error', reject).pipe((0, _zlib.createGunzip)().on('error', reject)).pipe((0, _tar.Extract)({ path, strip: 1 })).on('error', reject).on('end', () => resolve(log.info('Extracted to: ' + path)));
  });
}

function cleanSrc(clean, src, log) {
  if (clean === true) {
    log.info('Removing source: ' + src);
    return rimrafAsync(src).then(() => {
      log.info('Source deleted.' + src);
    });
  }
  return _bluebird.Promise.resolve();
}

/**
 * Deletes (maybe) and downloads the node source to the configured temporary directory
 * @param {*} compiler
 * @param {*} next
 */
function download(compiler, next) {
  const { src, log } = compiler;
  const { version, sourceUrl, clean } = compiler.options;
  const url = sourceUrl || `https://nodejs.org/dist/v${version}/node-v${version}.tar.gz`;

  return cleanSrc(clean, src, log).then(() => statAsync(src).then(x => !x.isDirectory() && fetchNodeSource(src, url, log), e => {
    if (e.code !== 'ENOENT') {
      throw e;
    }
    return fetchNodeSource(src, url, log);
  })).then(next);
}