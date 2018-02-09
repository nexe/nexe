import { Stats } from 'fs'
import { ok } from 'assert'
import * as Path from 'path'

const binary = (process as any).__nexe as NexeBinary
ok(binary)
const manifest = binary.resources
const directories: { [key: string]: { [key: string]: boolean } } = {}
const isString = (x: any): x is string => typeof x === 'string' || x instanceof String
const isNotFile = () => false
const isNotDirectory = isNotFile
const isFile = () => true
const isDirectory = isFile

const fs = require('fs')
const originalReadFile = fs.readFile
const originalReadFileSync = fs.readFileSync
const originalCreateReadStream = fs.createReadStream
const originalReaddir = fs.readdir
const originalReaddirSync = fs.readdirSync
const originalStatSync = fs.statSync
const originalStat = fs.stat
const originalRealpath = fs.realpath
const originalRealpathSync = fs.realpathSync
const resourceStart = binary.layout.resourceStart

const statTime = function() {
  const stat = binary.layout.stat
  return {
    dev: 0,
    ino: 0,
    nlink: 0,
    rdev: 0,
    uid: 123,
    gid: 500,
    blksize: 4096,
    blocks: 0,
    atime: new Date(stat.atime),
    atimeMs: stat.atime.getTime(),
    mtime: new Date(stat.mtime),
    mtimeMs: stat.mtime.getTime(),
    ctime: new Date(stat.ctime),
    ctimMs: stat.ctime.getTime(),
    birthtime: new Date(stat.birthtime),
    birthtimeMs: stat.birthtime.getTime()
  }
}

const createStat = function(directoryExtensions: any, fileExtensions?: any) {
  if (!fileExtensions) {
    return Object.assign({}, binary.layout.stat, directoryExtensions, { size: 0 }, statTime())
  }
  const size = directoryExtensions[1]
  return Object.assign({}, binary.layout.stat, fileExtensions, { size }, statTime())
}

const ownStat = function(path: string) {
  const key = Path.resolve(path)
  if (directories[key]) {
    return createStat({ isDirectory, isFile: isNotFile })
  }
  if (manifest[key]) {
    return createStat(manifest[key], { isFile, isDirectory: isNotDirectory })
  }
}

function makeLong(filepath: string) {
  return (Path as any)._makeLong && (Path as any)._makeLong(filepath)
}

let setupManifest = () => {
  Object.keys(manifest).forEach(key => {
    const entry = manifest[key]
    const absolutePath = Path.resolve(key)
    const longPath = makeLong(absolutePath)
    const normalizedPath = Path.normalize(key)

    if (!manifest[absolutePath]) {
      manifest[absolutePath] = entry
    }
    if (longPath && !manifest[longPath]) {
      manifest[longPath] = entry
    }
    if (!manifest[normalizedPath]) {
      manifest[normalizedPath] = manifest[key]
    }

    let currentDir = Path.dirname(absolutePath)
    let prevDir = absolutePath

    while (currentDir !== prevDir) {
      directories[currentDir] = directories[currentDir] || {}
      directories[currentDir][Path.basename(prevDir)] = true
      const longDir = makeLong(currentDir)
      if (longDir && !directories[longDir]) {
        directories[longDir] = directories[currentDir]
      }
      prevDir = currentDir
      currentDir = Path.dirname(currentDir)
    }
  })
  setupManifest = () => {}
}

//naive patches intended to work for most use cases
const nfs = {
  realpath: function realpath(path: any, options: any, cb: any): void {
    setupManifest()
    if (isString(path) && manifest[path]) {
      return process.nextTick(() => cb(null, path))
    }
    return originalRealpath.call(fs, path, options, cb)
  },
  realpathSync: function realpathSync(path: any, options: any) {
    setupManifest()
    if (isString(path) && manifest[path]) {
      return path
    }
    return originalRealpathSync.call(fs, path, options)
  },
  readdir: function readdir(path: string | Buffer, options: any, callback: any) {
    setupManifest()
    path = path.toString()
    if ('function' === typeof options) {
      callback = options
      options = { encoding: 'utf8' }
    }
    const dir = directories[Path.resolve(path)]
    if (dir) {
      process.nextTick(() => {
        //todo merge with original?
        callback(null, Object.keys(dir))
      })
    } else {
      return originalReaddir.apply(fs, arguments)
    }
  },

  readdirSync: function readdirSync(path: string | Buffer, options: any) {
    setupManifest()
    path = path.toString()
    const dir = directories[Path.resolve(path)]
    if (dir) {
      return Object.keys(dir)
    }
    return originalReaddirSync.apply(fs, arguments)
  },

  readFile: function readFile(file: any, options: any, callback: any) {
    setupManifest()
    const entry = manifest[file] || manifest[Path.resolve(file)]
    if (!entry || !isString(file)) {
      return originalReadFile.apply(fs, arguments)
    }
    const [offset, length] = entry
    const resourceOffset = resourceStart + offset
    const encoding = isString(options) ? options : null
    callback = typeof options === 'function' ? options : callback

    fs.open(process.execPath, 'r', function(err: Error, fd: number) {
      if (err) return callback(err, null)
      fs.read(fd, Buffer.alloc(length), 0, length, resourceOffset, function(
        error: Error,
        bytesRead: number,
        result: Buffer
      ) {
        if (error) {
          return fs.close(fd, function() {
            callback(error, null)
          })
        }
        fs.close(fd, function(err: Error) {
          if (err) {
            return callback(err, result)
          }
          callback(err, encoding ? result.toString(encoding) : result)
        })
      })
    })
  },
  createReadStream: function createReadStream(file: any, options: any) {
    setupManifest()
    const entry = manifest[file] || manifest[Path.resolve(file)]
    if (!entry || !isString(file)) {
      return originalCreateReadStream.apply(fs, arguments)
    }
    const [offset, length] = entry
    const resourceOffset = resourceStart + offset
    const opts = !options ? {} : isString(options) ? { encoding: options } : options

    return fs.createReadStream(
      process.execPath,
      Object.assign({}, opts, {
        start: resourceOffset,
        end: resourceOffset + length
      })
    )
  },
  readFileSync: function readFileSync(file: any, options: any) {
    setupManifest()
    const entry = manifest[file] || manifest[Path.resolve(file)]
    if (!entry || !isString(file)) {
      return originalReadFileSync.apply(fs, arguments)
    }
    const [offset, length] = entry
    const resourceOffset = resourceStart + offset
    const encoding = isString(options) ? options : null
    const fd = fs.openSync(process.execPath, 'r')
    const result = Buffer.alloc(length)
    fs.readSync(fd, result, 0, length, resourceOffset)
    fs.closeSync(fd)
    return encoding ? result.toString(encoding) : result
  },
  statSync: function statSync(path: string | Buffer) {
    const stat = isString(path) && ownStat(path)
    if (stat) {
      return stat
    }
    return originalStatSync.apply(fs, arguments)
  },
  stat: function stat(path: string | Buffer, callback: any) {
    const stat = isString(path) && ownStat(path)
    if (stat) {
      process.nextTick(() => {
        callback(null, stat)
      })
    } else {
      return originalStat.apply(fs, arguments)
    }
  }
}
const patches = (process as any).nexe.patches
delete (process as any).nexe

patches.internalModuleReadFile = function(this: any, original: any, ...args: any[]) {
  const [filepath] = args
  setupManifest()
  if (manifest[filepath]) {
    return nfs.readFileSync(filepath, 'utf-8')
  }
  return original.call(this, ...args)
}
patches.internalModuleStat = function(this: any, original: any, ...args: any[]) {
  setupManifest()
  const [filepath] = args
  if (manifest[filepath]) {
    return 0
  }
  if (directories[filepath]) {
    return 1
  }
  return original.call(this, ...args)
}
Object.assign(fs, nfs)

interface NexeBinary {
  resources: { [key: string]: number[] }
  layout: {
    stat: Stats
    contentSize: number
    contentStart: number
    resourceSize: number
    resourceStart: number
  }
}
