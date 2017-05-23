import { readFile, writeFile, stat } from 'fs'
import Bluebird from 'bluebird'

function dequote (input) {
  input = input.trim()
  const singleQuote = input.startsWith('\'') && input.endsWith('\'')
  const doubleQuote = input.startsWith('"') && input.endsWith('"')
  if (singleQuote || doubleQuote) {
    return input.slice(1).slice(0, -1)
  }
  return input
}

function readStreamAsync (stream) {
  return new Bluebird((resolve) => {
    let input = ''
    stream.setEncoding('utf-8')
    stream.on('data', x => { input += x })
    stream.once('end', () => resolve(dequote(input)))
    stream.resume && stream.resume()
  })
}

const readFileAsync = Bluebird.promisify(readFile)
const writeFileAsync = Bluebird.promisify(writeFile)
const statAsync = Bluebird.promisify(stat)
const isWindows = process.platform === 'win32'

function fileExistsAsync (path) {
  return statAsync(path).then(x => true, err => {
    if (err.code !== 'ENOENT') {
      throw err
    }
    return false
  })
}

export {
  dequote,
  isWindows,
  readFileAsync,
  fileExistsAsync,
  readStreamAsync,
  writeFileAsync
}
