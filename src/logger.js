const
  EOL = require('os').EOL,
  colors = require('chalk'),
  isFn = f => typeof f === 'function',
  logNoop = (x, cb) => {
    isFn(cb) && process.nextTick(cb)
  },
  safeCb = f => isFn(f) ? f : logNoop,
  logLevels = [
    ['verbose', 'green'],
    ['info', 'blue'],
    ['error', 'red']
  ],
  logger = logLevels.reduce((logMethods, info) => {
    const [level, color] = info
    logMethods[level] = function (output, cb) {
      process.stderr.write(colors[color](`${EOL}[${level}]: ${output}`), safeCb(cb))
    }
    return logMethods
  }, {
    setLevel (level) {
      if (level === 'silent') {
        return void logLevels.forEach(([x]) => logger[x] = logNoop)
      }
      process.on('beforeExit', () => {
        process.stderr.write(EOL)
      })
      if (level === 'info') {
        logger.verbose = logNoop
      }
      return logger
    }
  })

module.exports.logger = logger
