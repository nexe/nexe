import { Stats } from 'fs'
import { ok } from 'assert'
import { resolve, normalize } from 'path'

const binary = (process as any).__nexe as NexeBinary
ok(binary)
const manifest = binary.resources
const isString = (x: any): x is string => typeof x === 'string' || x instanceof String

if (Object.keys(manifest).length) {
  const fs = require('fs')
  const originalReadFile = fs.readFile
  const originalReadFileSync = fs.readFileSync
  const resourceStart = binary.layout.resourceStart

  let setupManifest = () => {
    const manifest = binary.resources
    Object.keys(manifest).forEach(key => {
      const absolutePath = resolve(key)
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
  //TODO track inflight fs reqs??
  var nfs = {
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
