#!/usr/bin/env node
const options = require('./lib/options')
if (require.main === module) {
  //fast path for help/version
  const argv = options.argv
  const eol = require('os').EOL
  const showHelp = argv.help || argv._.some(x => x === 'help')
  const showVersion = argv.version || argv._.some(x => x === 'version')
  if (showHelp || showVersion) {    
    process.stderr.write(showHelp ? options.help : options.version + eol)
  } else {
    const nexe = require('./lib/nexe')
    nexe.compile(argv).catch(() => {
      process.exit(1)
    })
  }
} else {
  module.exports = require('./lib/nexe')
}
