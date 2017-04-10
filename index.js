#!/usr/bin/env node
const nexe = require('./lib/nexe')
const { error } = require('./lib/logger')

module.exports = nexe

if (require.main === module) {
  nexe.compile(nexe.argv).catch((e) => {
    error(e.stack, () => process.exit(1))
  })
}
