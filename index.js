#!/usr/bin/env node
const nexe = require('.'),
  logger = require('./src/logger').logger

module.exports = nexe

if (require.main === module) {
  nexe.compile(nexe.options).catch((e) => {
    logger.error(e.stack, () => process.exit(1))
  })
}
