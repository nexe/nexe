'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dequote = exports.writeFileAsync = exports.readFileAsync = undefined;

var _fs = require('fs');

var _bluebird = require('bluebird');

function dequote(input) {
  input = input.trim();

  const singleQuote = input.startsWith('\'') && input.endsWith('\'');
  const doubleQuote = input.startsWith('"') && input.endsWith('"');
  if (singleQuote || doubleQuote) {
    return input.slice(1).slice(0, -1);
  }
  return input;
}

const readFileAsync = (0, _bluebird.promisify)(_fs.readFile);
const writeFileAsync = (0, _bluebird.promisify)(_fs.writeFile);

exports.readFileAsync = readFileAsync;
exports.writeFileAsync = writeFileAsync;
exports.dequote = dequote;