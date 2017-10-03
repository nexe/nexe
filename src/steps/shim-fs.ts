import { Stats } from 'fs'
import { ok } from 'assert'
import { dirname, resolve, normalize, basename } from 'path'

const binary = (process as any).__nexe as NexeBinary
ok(binary)
const manifest = binary.resources
const directories: { [key: string]: { [key: string]: boolean } } = {}
const isString = (x: any): x is string => typeof x === 'string' || x instanceof String
const isNotFile = () => false
const isNotDirectory = isNotFile
const isFile = () => true
const isDirectory = isFile

if (Object.keys(manifest).length) {
  const fs = require('fs')
  const originalReadFile = fs.readFile
  const originalReadFileSync = fs.readFileSync
  const originalReaddir = fs.readdir
  const originalReaddirSync = fs.readdirSync
  const originalStatSync = fs.statSync
  const originalStat = fs.stat
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

  const ownStat = function(path: string | Buffer) {
    const key = resolve(path)
    if (directories[key]) {
      return createStat({ isDirectory, isFile: isNotFile })
    }
    if (manifest[key]) {
      return createStat(manifest[key], { isFile, isDirectory: isNotDirectory })
    }
  }

  let setupManifest = () => {
    Object.keys(manifest).forEach(key => {
      const absolutePath = resolve(key)
      const dirPath = dirname(absolutePath)
      directories[dirPath] = directories[dirPath] || {}
      directories[dirPath][basename(absolutePath)] = true
      if (!manifest[absolutePath]) {
        manifest[absolutePath] = manifest[key]
      }
      const normalizedPath = normalize(key)
      if (!manifest[normalizedPath]) {
        manifest[normalizedPath] = manifest[key]
      }
    })
    setupManifest = () => {}
  }
  //naive patches intended to work for most use cases
  var nfs = {
    readdir: function readdir(path: string | Buffer, options: any, callback: any) {
      setupManifest()
      path = path.toString()
      if ('function' === typeof options) {
        callback = options
        options = { encoding: 'utf8' }
      }
      const dir = directories[resolve(path)]
      if (dir) {
        process.nextTick(() => {
          callback(null, Object.keys(dir))
        })
      } else {
        return originalReaddir.apply(fs, arguments)
      }
    },

    readdirSync: function readdirSync(path: string | Buffer, options: any) {
      setupManifest()
      path = path.toString()
      const dir = directories[resolve(path)]
      if (dir) {
        return Object.keys(dir)
      }
      return originalReaddirSync.apply(fs, arguments)
    },

    readFile: function readFile(file: any, options: any, callback: any) {
      setupManifest()
      const entry = manifest[file]
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
    readFileSync: function readFileSync(file: any, options: any) {
      setupManifest()
      const entry = manifest[file]
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
      const stat = ownStat(path)
      if (stat) {
        return stat
      }
      return originalStatSync.apply(fs, arguments)
    },
    stat: function stat(path: string | Buffer, callback: any) {
      const stat = ownStat(path)
      if (stat) {
        process.nextTick(() => {
          callback(null, stat)
        })
      } else {
        return originalStat.apply(fs, arguments)
      }
    }
  }
  Object.assign(fs, nfs)
}

interface NexeBinary {
  resources: { [key: string]: number[] }
  version: string
  layout: {
    stat: Stats
    contentSize: number
    contentStart: number
    resourceSize: number
    resourceStart: number
  }
}
