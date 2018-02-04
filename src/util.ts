import { readFile, writeFile, stat } from 'fs'
import { execFile } from 'child_process'
import pify = require('pify')
import rimraf = require('rimraf')

const rimrafAsync = pify(rimraf)

export async function each<T>(
  list: T[] | Promise<T[]>,
  action: (item: T, index: number, list: T[]) => Promise<any>
) {
  const l = await list
  return Promise.all(l.map(action))
}

export function wrap(code: string) {
  return '!(function () {' + code + '})();'
}

function falseOnEnoent(e: any) {
  if (e.code === 'ENOENT') {
    return false
  }
  throw e
}

function padRight(str: string, l: number) {
  return (str + ' '.repeat(l)).substr(0, l)
}

const bound: MethodDecorator = function bound<T>(
  target: Object,
  propertyKey: string | Symbol,
  descriptor: TypedPropertyDescriptor<T>
) {
  const configurable = true
  return {
    configurable,
    get(this: T) {
      const value = (descriptor.value as any).bind(this)
      Object.defineProperty(this, propertyKey as string, {
        configurable,
        value,
        writable: true
      })
      return value
    }
  }
}

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
  (path: string): Promise<Buffer>
  (path: string, encoding: string): Promise<string>
}

const readFileAsync = pify(readFile)
const writeFileAsync = pify(writeFile)
const statAsync = pify(stat)
const execFileAsync = pify(execFile)
const isWindows = process.platform === 'win32'

function pathExistsAsync(path: string) {
  return statAsync(path)
    .then(x => true)
    .catch(falseOnEnoent)
}

function isDirectoryAsync(path: string) {
  return statAsync(path)
    .then(x => x.isDirectory())
    .catch(falseOnEnoent)
}

export {
  dequote,
  padRight,
  bound,
  isWindows,
  rimrafAsync,
  statAsync,
  execFileAsync,
  readFileAsync,
  pathExistsAsync,
  isDirectoryAsync,
  writeFileAsync
}
