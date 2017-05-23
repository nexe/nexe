#!/usr/bin/env node
const nexe = require('./lib/nexe')
const logger = require('./lib/logger').default

module.exports = nexe

if (require.main === module) {
  nexe.compile(nexe.argv).catch((e) => {
    logger.error(e.stack, () => process.exit(1))
  })
}
