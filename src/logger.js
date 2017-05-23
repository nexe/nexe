import { EOL } from 'os'
import colors from 'chalk'

function isFn (f) {
  return typeof f === 'function'
}

function logNoop (x, cb) {
  return isFn(cb) && process.nextTick(cb)
}

function safeCb (f) {
  return isFn(f) ? f : logNoop
}

const logLevels = [
  ['verbose', 'green'],
  ['info', 'blue'],
  ['error', 'red']
]

const logger = logLevels.reduce((logMethods, info) => {
  const [level, color] = info
  logMethods[level] = function (output, cb) {
    process.stderr.write(colors[color](`${EOL}[${level}]: ${output}`), safeCb(cb))
  }
  return logMethods
}, {
  setLevel (level) {
    if (level === 'silent') {
      logLevels.forEach(([x]) => {
        logger[x] = logNoop
      })
      return
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

export default logger
