const fs = require('fs')
const fd = fs.openSync(process.execPath, 'r')
const stat = fs.statSync(process.execPath)
const footer = Buffer.alloc(32, 0)

fs.readSync(fd, footer, 0, 32, stat.size - 32)

if (!footer.slice(0, 16).equals(Buffer.from('<nexe~~sentinel>'))) {
  throw 'Invalid Nexe binary'
}

const contentSize = footer.readDoubleLE(16)
const resourceSize = footer.readDoubleLE(24)
const contentStart = stat.size - 32 - resourceSize - contentSize
const resourceStart = contentStart + contentSize

Object.defineProperty(
  process,
  '__nexe',
  (function() {
    let nexeHeader: any = null
    return {
      get: function() {
        return nexeHeader
      },
      set: function(value: any) {
        if (nexeHeader) {
          throw new Error('__nexe cannot be reconfigured')
        }
        nexeHeader = Object.assign({}, value, {
          layout: {
            stat,
            contentSize,
            contentStart,
            resourceSize,
            resourceStart
          }
        })
        Object.freeze(nexeHeader)
      },
      enumerable: false,
      configurable: false
    }
  })()
)

const contentBuffer = Buffer.from(Array(contentSize))
fs.readSync(fd, contentBuffer, 0, contentSize, contentStart)
fs.closeSync(fd)
const Module = require('module')
process.mainModule = new Module(process.execPath, null)
process.mainModule!.loaded = true
;(process.mainModule as any)._compile(contentBuffer.toString(), process.execPath)
