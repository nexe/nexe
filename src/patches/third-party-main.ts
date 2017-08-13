import { NexeCompiler } from '../compiler'

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  await compiler.setFileContentsAsync(
    'lib/_third_party_main.js',
    `
const fs = require('fs')
const Buffer = require('buffer').Buffer
const isString = x => typeof x === 'string' || x instanceof String

Object.defineProperty(process, '__nexe', (function () {
  let nexeHeader = null
  return {
    get: function () {
      return nexeHeader
    },
    set: function (value) {
      if (nexeHeader) {
        throw new Error('__nexe cannot be reconfigured')
      }
      nexeHeader = value
      Object.freeze(nexeHeader)
    },
    enumerable: false,
    configurable: false
  }
})());

const originalReadFile = fs.readFile
const originalReadFileSync = fs.readFileSync

fs.readFile = function readFile (file, options, callback) {
  const manifest = process.__nexe
  const entry = manifest && manifest.resources[file]
  if (!manifest || !entry || !isString(file)) {
    return originalReadFile.apply(fs, arguments)
  }
  const [offset, length] = entry
  const resourceOffset = +manifest.binaryOffset + +manifest.resourceOffset + offset
  const encoding = isString(options) ? options : null
  callback = typeof options === 'function' ? options : callback

  fs.open(process.execPath, 'r', function (err, fd) {
    if (err) return callback(err, null)
    fs.read(fd, Buffer.alloc(length), 0, length, resourceOffset, function (error, bytesRead, buffer) {
      if (error) {
        return fs.close(fd, function () {
          callback(error, null)
        })
      }
      fs.close(fd, function (err) {
        if (err) {
          return callback(err, buffer)
        }
        const result = Buffer.from(buffer.toString(), 'base64')
        callback(err, encoding ? result.toString(encoding) : result)
      })
    })
  })
}

fs.readFileSync = function readFileSync (file, options) {
  const manifest = process.__nexe
  const entry = manifest && manifest.resources[file]
  if (!manifest || !entry || !isString(file)) {
    return originalReadFileSync.apply(fs, arguments)
  }
  const [offset, length] = entry
  const resourceOffset = +manifest.binaryOffset + +manifest.resourceOffset + offset
  const encoding = isString(options) ? options : null
  const fd = fs.openSync(process.execPath, 'r')
  const result = Buffer.alloc(length)
  fs.readSync(fd, result, 0, length, resourceOffset)
  fs.closeSync(fd)
  const contents = Buffer.from(result.toString(), 'base64')
  return encoding ? contents.toString(encoding) : contents
}`.trim()
  )
  return next()
}
