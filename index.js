#!/usr/bin/env node
const nexe = require('./lib/nexe')
const eol = require('os').EOL

module.exports = nexe

if (require.main === module) {
  nexe.compile(nexe.argv).catch((e) => {
    process.stderr.write(eol + e.stack, () => process.exit(1))
  })
}
