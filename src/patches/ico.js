const
  { readFile } = require('fs'),
  { normalize } = require('path'),
  { promisify } = require('bluebird')

const readFileAsync = promisify(readFile)

module.exports.ico = function * ico (compiler, next) {
  const iconFile = compiler.options.ico
  if (!iconFile) {
    return next()
  }
  const file = yield compiler.readFileAsync('src/res/node.ico')
  file.contents = yield readFileAsync(normalize(iconFile))
  return next()
}
