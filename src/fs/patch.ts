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
let lazyRestoreFs = () => {}

// optional Win32 file namespace prefix followed by drive letter and colon
const windowsFullPathRegex = /^(\\{2}\?\\)?([a-zA-Z]):/

const upcaseDriveLetter = (s: string): string =>
  s.replace(windowsFullPathRegex, (_match, ns, drive) => `${ns || ''}${drive.toUpperCase()}:`)

function shimFs(binary: NexeBinary, fs: any = require('fs')) {
  if (originalFsMethods !== null) {
    return
  }
  originalFsMethods = Object.assign({}, fs)
  const { blobPath, resources: manifest } = binary,
    { resourceStart, stat } = binary.layout,
    directories: { [key: string]: { [key: string]: boolean } } = {},
    notAFile = '!@#$%^&*',
    isWin = process.platform.startsWith('win'),
    isString = (x: any): x is string => typeof x === 'string' || x instanceof String,
    noop = () => {},
    path = require('path'),
    winPath: (key: string) => string = isWin ? upcaseDriveLetter : (s) => s,
    baseDir = winPath(path.dirname(process.execPath))

  let log = (_: string) => true
  let loggedManifest = false
  if ((process.env.DEBUG || '').toLowerCase().includes('nexe:require')) {
    log = (text: string) => {
      setupManifest()
      if (!loggedManifest) {
        process.stderr.write('[nexe] - MANIFEST' + JSON.stringify(manifest, null, 4) + '\n')
        process.stderr.write('[nexe] - DIRECTORIES' + JSON.stringify(directories, null, 4) + '\n')
        loggedManifest = true
      }
      return process.stderr.write('[nexe] - ' + text + '\n')
    }
  }

  const getKey = function getKey(filepath: string | Buffer | null): string {
    if (Buffer.isBuffer(filepath)) {
      filepath = filepath.toString()
    }
    if (!isString(filepath)) {
      return notAFile
    }
    let key = path.resolve(baseDir, filepath)

    return winPath(key)
  }

  const statTime = function () {
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
      birthtimeMs: stat.birthtime.getTime(),
    }
  }

  let BigInt: Function
  try {
    BigInt = eval('BigInt')
  } catch (ignored) {}

  const createStat = function (extensions: any, options: any) {
    const stat = Object.assign(new fs.Stats(), binary.layout.stat, statTime(), extensions)
    if (options && options.bigint && BigInt) {
      for (const k in stat) {
        if (Object.prototype.hasOwnProperty.call(stat, k) && typeof stat[k] === 'number') {
          stat[k] = BigInt(stat[k])
        }
      }
    }
    return stat
  }

  const ownStat = function (filepath: any, options: any) {
    setupManifest()
    const key = getKey(filepath)
    if (directories[key]) {
      let mode = binary.layout.stat.mode
      mode |= fs.constants.S_IFDIR
      mode &= ~fs.constants.S_IFREG
      return createStat({ mode, size: 0 }, options)
    }
    if (manifest[key]) {
      return createStat({ size: manifest[key][1] }, options)
    }
  }

  function makeLong(filepath: string) {
    return (path as any)._makeLong && (path as any)._makeLong(filepath)
  }

  function fileOpts(options: any) {
    return !options ? {} : isString(options) ? { encoding: options } : options
  }

  let setupManifest = () => {
    Object.keys(manifest).forEach((filepath) => {
      const entry = manifest[filepath]
      const absolutePath = getKey(filepath)
      const longPath = makeLong(absolutePath)
      const normalizedPath = winPath(path.normalize(filepath))

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
    ;(manifest[notAFile] as any) = false
    ;(directories[notAFile] as any) = false
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
      if (manifest[key]) {
        return filepath
      }
      return originalFsMethods.realpathSync.call(fs, filepath, options)
    },
    readdir: function readdir(filepath: string | Buffer, options: any, callback: any) {
      setupManifest()
      const dir = directories[getKey(filepath)]
      if (dir) {
        if ('function' === typeof options) {
          callback = options
          options = { encoding: 'utf8' }
        }
        process.nextTick(() => callback(null, Object.keys(dir)))
      } else {
        return originalFsMethods.readdir.apply(fs, arguments)
      }
    },
    readdirSync: function readdirSync(filepath: string | Buffer, options: any) {
      setupManifest()
      const dir = directories[getKey(filepath)]
      if (dir) {
        return Object.keys(dir)
      }
      return originalFsMethods.readdirSync.apply(fs, arguments)
    },

    readFile: function readFile(filepath: any, options: any, callback: any) {
      setupManifest()
      const entry = manifest[getKey(filepath)]
      if (!entry) {
        return originalFsMethods.readFile.apply(fs, arguments)
      }
      const [offset, length] = entry
      const resourceOffset = resourceStart + offset
      const encoding = fileOpts(options).encoding
      callback = typeof options === 'function' ? options : callback

      originalFsMethods.open(blobPath, 'r', function (err: Error, fd: number) {
        if (err) return callback(err, null)
        originalFsMethods.read(fd, Buffer.alloc(length), 0, length, resourceOffset, function (
          error: Error,
          bytesRead: number,
          result: Buffer
        ) {
          if (error) {
            return originalFsMethods.close(fd, function () {
              callback(error, null)
            })
          }
          originalFsMethods.close(fd, function (err: Error) {
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
      const entry = manifest[getKey(filepath)]
      if (!entry) {
        return originalFsMethods.createReadStream.apply(fs, arguments)
      }
      const [offset, length] = entry
      const resourceOffset = resourceStart + offset
      const opts = fileOpts(options)

      return originalFsMethods.createReadStream(
        blobPath,
        Object.assign({}, opts, {
          start: resourceOffset,
          end: resourceOffset + length - 1,
        })
      )
    },
    readFileSync: function readFileSync(filepath: any, options: any) {
      setupManifest()
      const entry = manifest[getKey(filepath)]
      if (!entry) {
        return originalFsMethods.readFileSync.apply(fs, arguments)
      }
      const [offset, length] = entry
      const resourceOffset = resourceStart + offset
      const encoding = fileOpts(options).encoding
      const fd = originalFsMethods.openSync(process.execPath, 'r')
      const result = Buffer.alloc(length)
      originalFsMethods.readSync(fd, result, 0, length, resourceOffset)
      originalFsMethods.closeSync(fd)
      return encoding ? result.toString(encoding) : result
    },
    statSync: function statSync(filepath: string | Buffer, options: any) {
      const stat = ownStat(filepath, options)
      if (stat) {
        return stat
      }
      return originalFsMethods.statSync.apply(fs, arguments)
    },
    stat: function stat(filepath: string | Buffer, options: any, callback: any) {
      let stat: any
      if (typeof options === 'function') {
        callback = options
        stat = ownStat(filepath, null)
      } else {
        stat = ownStat(filepath, options)
      }
      if (stat) {
        process.nextTick(() => {
          callback(null, stat)
        })
      } else {
        return originalFsMethods.stat.apply(fs, arguments)
      }
    },
  }

  if (typeof fs.exists === 'function') {
    nfs.exists = function (filepath: string, cb: Function) {
      cb = cb || noop
      const exists = nfs.existsSync(filepath)
      process.nextTick(() => cb(exists))
    }
  }

  const patches = (process as any).nexe.patches || {}
  delete (process as any).nexe
  patches.internalModuleReadFile = function (this: any, original: any, ...args: any[]) {
    setupManifest()
    const filepath = getKey(args[0])
    if (manifest[filepath]) {
      log('read     (hit)              ' + filepath)
      return nfs.readFileSync(filepath, 'utf-8')
    }
    log('read          (miss)       ' + filepath)
    return original.call(this, ...args)
  }
  patches.internalModuleReadJSON = patches.internalModuleReadFile
  patches.internalModuleStat = function (this: any, original: any, ...args: any[]) {
    setupManifest()
    const filepath = getKey(args[0])
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
    nfs.exists = function (filepath: string, cb: Function) {
      cb = cb || noop
      const exists = nfs.existsSync(filepath)
      if (!exists) {
        return originalFsMethods.exists(filepath, cb)
      }
      process.nextTick(() => cb(exists))
    }
  }

  if (typeof fs.copyFile === 'function') {
    nfs.copyFile = function (filepath: string, dest: string, flags: number, callback: Function) {
      setupManifest()
      const entry = manifest[getKey(filepath)]
      if (!entry) {
        return originalFsMethods.copyFile.apply(fs, arguments)
      }
      if (typeof flags === 'function') {
        callback = flags
        flags = 0
      }
      nfs.readFile(filepath, (err: any, buffer: any) => {
        if (err) {
          return callback(err)
        }
        originalFsMethods.writeFile(dest, buffer, (err: any) => {
          if (err) {
            return callback(err)
          }
          callback(null)
        })
      })
    }
    nfs.copyFileSync = function (filepath: string, dest: string) {
      setupManifest()
      const entry = manifest[getKey(filepath)]
      if (!entry) {
        return originalFsMethods.copyFileSync.apply(fs, arguments)
      }
      return originalFsMethods.writeFileSync(dest, nfs.readFileSync(filepath))
    }
  }

  Object.assign(fs, nfs)

  lazyRestoreFs = () => {
    Object.keys(nfs).forEach((key) => {
      fs[key] = originalFsMethods[key]
    })
    lazyRestoreFs = () => {}
  }
  return true
}

function restoreFs() {
  lazyRestoreFs()
}

export { shimFs, restoreFs }
