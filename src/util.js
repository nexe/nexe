import { readFile, writeFile, stat } from 'fs'
import Bluebird from 'bluebird'
import rimraf from 'rimraf'

const rimrafAsync = Bluebird.promisify(rimraf)

function dequote (input) {
  input = input.trim()
  const singleQuote = input.startsWith('\'') && input.endsWith('\'')
  const doubleQuote = input.startsWith('"') && input.endsWith('"')
  if (singleQuote || doubleQuote) {
    return input.slice(1).slice(0, -1)
  }
  return input
}

const readFileAsync = Bluebird.promisify(readFile)
const writeFileAsync = Bluebird.promisify(writeFile)
const statAsync = Bluebird.promisify(stat)
const isWindows = process.platform === 'win32'

function pathExistsAsync (path) {
  return statAsync(path).then(x => true, err => {
    if (err.code !== 'ENOENT') {
      throw err
    }
    return false
  })
}

function isDirectoryAsync (path) {
  return statAsync(path)
    .then(x => x.isDirectory())
    .catch({ code: 'ENOENT' }, () => false)
}

export {
  dequote,
  isWindows,
  rimrafAsync,
  readFileAsync,
  pathExistsAsync,
  isDirectoryAsync,
  writeFileAsync
}
