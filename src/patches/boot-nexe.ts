const fs = require('fs'),
  fd = fs.openSync(process.execPath, 'r'),
  stat = fs.statSync(process.execPath),
  tailSize = Math.min(stat.size, 16000),
  tailWindow = Buffer.from(Array(tailSize))

fs.readSync(fd, tailWindow, 0, tailSize, stat.size - tailSize)

const footerPosition = tailWindow.indexOf('<nexe~~sentinel>')
if (footerPosition == -1) {
  throw 'Invalid Nexe binary'
}

const footer = tailWindow.slice(footerPosition, footerPosition + 32),
  contentSize = footer.readDoubleLE(16),
  resourceSize = footer.readDoubleLE(24),
  contentStart = stat.size - tailSize + footerPosition - resourceSize - contentSize,
  resourceStart = contentStart + contentSize

Object.defineProperty(
  process,
  '__nexe',
  (function () {
    let nexeHeader: any = null
    return {
      get: function () {
        return nexeHeader
      },
      set: function (value: any) {
        if (nexeHeader) {
          throw new Error('This property is readonly')
        }
        nexeHeader = Object.assign({}, value, {
          blobPath: process.execPath,
          layout: {
            stat,
            contentSize,
            contentStart,
            resourceSize,
            resourceStart,
          },
        })
        Object.freeze(nexeHeader)
      },
      enumerable: false,
      configurable: false,
    }
  })()
)

const contentBuffer = Buffer.from(Array(contentSize)),
  Module = require('module')

fs.readSync(fd, contentBuffer, 0, contentSize, contentStart)
fs.closeSync(fd)

new Module(process.execPath, null)._compile(contentBuffer.toString(), process.execPath)
