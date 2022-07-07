#!/usr/bin/env node

/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const eol = require('os').EOL
async function main() {
  const util = require('./lib/cjs/util.js')
  await util.initEsm()
  const color = util.color,
    options = require('./lib/cjs/options.js'),
    nexe = require('./lib/cjs/nexe.js'),
    NexeError = require('./lib/cjs/compiler.js').NexeError,
    del = eol + eol,
    argv = options.argv,
    showHelp = argv.help || argv._.some((x) => x === 'help'),
    showVersion = argv.version || argv._.some((x) => x === 'version')

  try {
    if (!(showHelp || showVersion)) {
      await nexe.compile(argv)
    } else {
      process.stderr.write(showHelp ? options.help() : options.version + eol)
    }
  } catch (error) {
    if (argv.loglevel !== 'silent') {
      if (error instanceof NexeError) {
        process.stderr.write(
          `${eol}${color('red', 'Error: ')}${error.message}${del}See nexe -h for usage..${del}`
        )
      } else {
        process.stderr.write(error.stack + eol)
      }
    }
    process.exit(1)
  }
  process.exit(0)
}

if (require.main === module) {
  main()
} else {
  process.stderr.write('Cannot require(..) the nexe cli')
  process.exit(1)
}
