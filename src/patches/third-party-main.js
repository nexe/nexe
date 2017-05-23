export default async function main (compiler, next) {
  const mainFile = await compiler.readFileAsync('lib/_third_party_main.js')
  mainFile.contents = `
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

const fs = require('fs')
const originalReadFile = fs.readFile
const Buffer = require('buffer').Buffer
const isString = x => typeof x === 'string' || x instanceof String

fs.readFile = function readFile (file, options, callback) {
  const manifest = process.__nexe
  const entry = manifest && manifest.resources[file]
  if (!manifest || !entry || !isString(file)) {
    return originalReadFile.apply(fs, arguments)
  }
  const [offset, length] = entry
  const resourceOffset = +manifest.binaryOffset + +manifest.resourceOffset + offset
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
        callback(err, Buffer.from(buffer.toString(), 'base64'))
      })
    })
  })
}
require("${compiler.options.name}");
    `.trim()
  return next()
}
