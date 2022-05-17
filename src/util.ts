import { readFile, writeFile, stat } from 'node:fs/promises'
import { execFile as exec } from 'node:child_process'
import { promisify } from 'node:util'

export const STDIN_FLAG = '[stdin]'

export const esm: {
  chalk: typeof import('chalk') | null
  ora: typeof import('ora') | null
  got: typeof import('got') | null
} = {
  got: null,
  chalk: null,
  ora: null,
}

export async function initEsm() {
  await Promise.all(
    (['chalk', 'got', 'ora'] as const).map(async (x) => {
      esm[x] = await import(x)
    })
  )
}

const id = (x: any) => x
export function color(color?: string, text?: string) {
  return !color ? text : ((esm.chalk?.default as any)[color] || id)(text)
}

export type Func<T = any, Args = any> = (...args: Args[]) => T

export async function each<T>(
  list: T[] | Promise<T[]>,
  action: (item: T, index: number, list: T[]) => Promise<any>
) {
  const l = await list
  return await Promise.all(l.map(action))
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
  return (str + ' '.repeat(l)).slice(0, l)
}

const bound: MethodDecorator = function bound<T>(
  target: object,
  propertyKey: string | symbol,
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
        writable: true,
      })
      return value
    },
  }
}

function dequote(input: string) {
  input = input.trim()
  const singleQuote = input.startsWith("'") && input.endsWith("'"),
    doubleQuote = input.startsWith('"') && input.endsWith('"')
  if (singleQuote || doubleQuote) {
    return input.slice(1).slice(0, -1)
  }
  return input
}

export interface ReadFileAsync {
  (path: string): Promise<Buffer>
  (path: string, encoding: string): Promise<string>
}

const execFile = promisify(exec),
  isWindows = process.platform === 'win32'

async function pathExists(path: string) {
  return await stat(path)
    .then(() => true)
    .catch(falseOnEnoent)
}

async function isDirectory(path: string) {
  return await stat(path)
    .then((x) => x.isDirectory())
    .catch(falseOnEnoent)
}

function semverGt(version: string, operand: string) {
  const [cMajor, cMinor, cPatch] = version.split('.').map(Number)
  let [major, minor, patch] = operand.split('.').map(Number)
  major = Number(major)
  if (!minor) minor = 0
  if (!patch) patch = 0
  return (
    cMajor > major ||
    (cMajor === major && cMinor > minor) ||
    (cMajor === major && cMinor === minor && cPatch > patch)
  )
}

export {
  dequote,
  padRight,
  bound,
  isWindows,
  stat,
  execFile,
  readFile,
  pathExists,
  isDirectory,
  writeFile,
  semverGt,
}
