import { readFile, writeFile } from 'fs'
import Bluebird from 'bluebird'
import module from 'module'

function resolveModule (path) {
  const filename = module._resolveFilename(path, module)
  console.log('resolving module ', path)
  return filename
}

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

export {
  readFileAsync,
  writeFileAsync,
  dequote,
  resolveModule
}
