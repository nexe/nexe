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
    nexe.compile(argv).catch((error) => {
      const NexeError = require('./lib/compiler').NexeError
      const chalk = require('chalk')
      const isSilent = Boolean(argv.silent === true || argv.loglevel === 'silent')
      if (!isSilent) {
        if (error instanceof NexeError) {
          process.stderr.write(eol + chalk.red('Error: ') + error.message + eol
            + eol + 'See nexe -h for usage..' + eol + eol
          )
        } else {
          process.stderr.write(error.stack + eol)
        }
      }

      process.exit(1)
    })
  }
} else {
  module.exports = require('./lib/nexe')
}
