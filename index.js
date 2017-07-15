#!/usr/bin/env node
const nexe = require('./lib/nexe')

module.exports = nexe

if (require.main === module) {
  nexe.compile(nexe.argv).catch((e) => {
    process.stderr.write(e.message, () => process.exit(1))
  })
}
