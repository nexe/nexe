import { Stats } from 'fs'

export interface NexeBinary {
  blobPath: string
  resources: { [key: string]: number[] }
  layout: {
    stat: Stats
    resourceStart: number
    contentSize?: number
    contentStart?: number
    resourceSize?: number
  }
}

let originalFsMethods: any = null

function restoreFs(fs: any) {
  if (!originalFsMethods) {
    return
  }
  Object.assign(fs, originalFsMethods)
}

function shimFs(binary: NexeBinary, fs: any = require('fs')) {
  originalFsMethods = Object.assign({}, fs)
  const { blobPath, resources: manifest } = binary
  const { resourceStart, stat } = binary.layout
  const directories: { [key: string]: { [key: string]: boolean } } = {},
    isString = (x: any): x is string => typeof x === 'string' || x instanceof String,
    isNotFile = () => false,
    isNotDirectory = isNotFile,
    isFile = () => true,
    noop = () => {},
    isDirectory = isFile,
    path = require('path')

  let log = (text: string) => {
    if ((process.env.DEBUG || '').toLowerCase().includes('nexe:require')) {
      process.stderr.write('[nexe] - ' + text + '\n')
    } else {
      log = noop
    }
  }

  const getKey = process.platform.startsWith('win')
    ? function getKey(filepath: string): string {
        let key = path.resolve(filepath)
        if (key.substr(1, 2) === ':\\') {
          key = key[0].toUpperCase() + key.substr(1)
        }
        return key
      }
    : path.resolve

  const statTime = function() {
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

  const ownStat = function(filepath: string) {
    setupManifest()
    const key = getKey(filepath)
    if (directories[key]) {
      return createStat({ isDirectory, isFile: isNotFile })
    }
    if (manifest[key]) {
      return createStat(manifest[key], { isFile, isDirectory: isNotDirectory })
    }
  }

  function makeLong(filepath: string) {
    return (path as any)._makeLong && (path as any)._makeLong(filepath)
  }

  function fileOpts(options: any) {
    return !options ? {} : isString(options) ? { encoding: options } : options
  }

  let setupManifest = () => {
    Object.keys(manifest).forEach(filepath => {
      const entry = manifest[filepath]
      const absolutePath = getKey(filepath)
      const longPath = makeLong(absolutePath)
      const normalizedPath = path.normalize(filepath)

      if (!manifest[absolutePath]) {
        manifest[absolutePath] = entry
      }
      if (longPath && !manifest[longPath]) {
        manifest[longPath] = entry
      }
      if (!manifest[normalizedPath]) {
        manifest[normalizedPath] = manifest[filepath]
      }

      let currentDir = path.dirname(absolutePath)
      let prevDir = absolutePath

      while (currentDir !== prevDir) {
        directories[currentDir] = directories[currentDir] || {}
        directories[currentDir][path.basename(prevDir)] = true
        const longDir = makeLong(currentDir)
        if (longDir && !directories[longDir]) {
          directories[longDir] = directories[currentDir]
        }
        prevDir = currentDir
        currentDir = path.dirname(currentDir)
      }
    })
    setupManifest = noop
  }

  //naive patches intended to work for most use cases
  const nfs: any = {
    existsSync: function existsSync(filepath: string) {
      setupManifest()
      const key = getKey(filepath)
      if (manifest[key] || directories[key]) {
        return true
      }
      return originalFsMethods.existsSync.apply(fs, arguments)
    },
    realpath: function realpath(filepath: any, options: any, cb: any): void {
      setupManifest()
      const key = getKey(filepath)
      if (isString(filepath) && (manifest[filepath] || manifest[key])) {
        return process.nextTick(() => cb(null, filepath))
      }
      return originalFsMethods.realpath.call(fs, filepath, options, cb)
    },
    realpathSync: function realpathSync(filepath: any, options: any) {
      setupManifest()
      const key = getKey(filepath)
      if (isString(filepath) && (manifest[filepath] || manifest[key])) {
        return filepath
      }
      return originalFsMethods.realpathSync.call(fs, filepath, options)
    },
    readdir: function readdir(filepath: string | Buffer, options: any, callback: any) {
      setupManifest()
      filepath = filepath.toString()
      if ('function' === typeof options) {
        callback = options
        options = { encoding: 'utf8' }
      }
      const dir = directories[getKey(filepath)]
      if (dir) {
        process.nextTick(() => {
          //todo merge with original?
          callback(null, Object.keys(dir))
        })
      } else {
        return originalFsMethods.readdir.apply(fs, arguments)
      }
    },

    readdirSync: function readdirSync(filepath: string | Buffer, options: any) {
      setupManifest()
      filepath = filepath.toString()
      const dir = directories[getKey(filepath)]
      if (dir) {
        return Object.keys(dir)
      }
      return originalFsMethods.readdirSync.apply(fs, arguments)
    },

    readFile: function readFile(filepath: any, options: any, callback: any) {
      setupManifest()
      const entry = manifest[filepath] || manifest[getKey(filepath)]
      if (!entry || !isString(filepath)) {
        return originalFsMethods.readFile.apply(fs, arguments)
      }
      const [offset, length] = entry
      const resourceOffset = resourceStart + offset
      const encoding = fileOpts(options).encoding
      callback = typeof options === 'function' ? options : callback

      fs.open(blobPath, 'r', function(err: Error, fd: number) {
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
    createReadStream: function createReadStream(filepath: any, options: any) {
      setupManifest()
      const entry = manifest[filepath] || manifest[getKey(filepath)]
      if (!entry || !isString(filepath)) {
        return originalFsMethods.createReadStream.apply(fs, arguments)
      }
      const [offset, length] = entry
      const resourceOffset = resourceStart + offset
      const opts = fileOpts(options)

      return fs.createReadStream(
        blobPath,
        Object.assign({}, opts, {
          start: resourceOffset,
          end: resourceOffset + length - 1
        })
      )
    },
    readFileSync: function readFileSync(filepath: any, options: any) {
      setupManifest()

      const entry = manifest[filepath] || manifest[getKey(filepath)]
      if (!entry || !isString(filepath)) {
        return originalFsMethods.readFileSync.apply(fs, arguments)
      }
      const [offset, length] = entry
      const resourceOffset = resourceStart + offset
      const encoding = fileOpts(options).encoding
      const fd = fs.openSync(process.execPath, 'r')
      const result = Buffer.alloc(length)
      fs.readSync(fd, result, 0, length, resourceOffset)
      fs.closeSync(fd)
      return encoding ? result.toString(encoding) : result
    },
    statSync: function statSync(filepath: string | Buffer) {
      const stat = isString(filepath) && ownStat(filepath)
      if (stat) {
        return stat
      }
      return originalFsMethods.statSync.apply(fs, arguments)
    },
    stat: function stat(filepath: string | Buffer, callback: any) {
      const stat = isString(filepath) && ownStat(filepath)
      if (stat) {
        process.nextTick(() => {
          callback(null, stat)
        })
      } else {
        return originalFsMethods.stat.apply(fs, arguments)
      }
    }
  }

  if (typeof fs.exists === 'function') {
    nfs.exists = function(filepath: string, cb: Function) {
      cb = cb || noop
      const exists = nfs.existsSync(filepath)
      process.nextTick(() => cb(exists))
    }
  }

  const patches = (process as any).nexe.patches || {}
  delete (process as any).nexe
  patches.internalModuleReadFile = function(this: any, original: any, ...args: any[]) {
    const [filepath] = args
    setupManifest()
    if (manifest[filepath]) {
      log('read     (hit)              ' + filepath)
      return nfs.readFileSync(filepath, 'utf-8')
    }
    log('read          (miss)       ' + filepath)
    return original.call(this, ...args)
  }
  patches.internalModuleStat = function(this: any, original: any, ...args: any[]) {
    setupManifest()
    const [filepath] = args
    if (manifest[filepath]) {
      log('stat     (hit)              ' + filepath + '   ' + 0)
      return 0
    }
    if (directories[filepath]) {
      log('stat dir (hit)              ' + filepath + '   ' + 1)
      return 1
    }
    const res = original.call(this, ...args)
    if (res === 0) {
      log('stat          (miss)        ' + filepath + '   ' + res)
    } else if (res === 1) {
      log('stat dir      (miss)        ' + filepath + '   ' + res)
    } else {
      log('stat                 (fail) ' + filepath + '   ' + res)
    }
    return res
  }

  if (typeof fs.exists === 'function') {
    nfs.exists = function(filepath: string, cb: Function) {
      cb = cb || noop
      const exists = nfs.existsSync(filepath)
      if (!exists) {
        return originalFsMethods.exists(filepath, cb)
      }
      process.nextTick(() => cb(exists))
    }
  }
}

export { shimFs as applyFsPatch, restoreFs }
