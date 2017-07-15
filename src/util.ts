import { readFile, writeFile, stat } from 'fs'
import * as Bluebird from 'bluebird'
import rimraf = require('rimraf')

const { promisify } = Bluebird
const rimrafAsync = (promisify(rimraf) as any) as (path: string) => Bluebird<void>

function dequote(input: string) {
  input = input.trim()
  const singleQuote = input.startsWith("'") && input.endsWith("'")
  const doubleQuote = input.startsWith('"') && input.endsWith('"')
  if (singleQuote || doubleQuote) {
    return input.slice(1).slice(0, -1)
  }
  return input
}

export interface ReadFileAsync {
  (path: string): Bluebird<Buffer>
  (path: string, encoding: string): Bluebird<string>
}

const readFileAsync = (promisify(readFile) as any) as ReadFileAsync
const writeFileAsync = (promisify(writeFile) as any) as (
  path: string,
  contents: string | Buffer
) => Promise<void>
const statAsync = promisify(stat)
const isWindows = process.platform === 'win32'

function pathExistsAsync(path: string) {
  return statAsync(path).then(x => true).catch({ code: 'ENOENT' }, () => false)
}

function isDirectoryAsync(path: string) {
  return statAsync(path).then(x => x.isDirectory()).catch({ code: 'ENOENT' }, () => false)
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
