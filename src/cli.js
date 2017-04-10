const
  { normalize } = require('path'),
  { Promise, promisify } = require('bluebird'),
  { createWriteStream, readFile } = require('fs'),
  { dequote } = require('./util')

const readFileAsync = promisify(readFile),
  isWindows = process.platform === 'win32'

function getStdIn () {
  return new Promise((resolve) => {
    const bundle = []
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', x => bundle.push(x))
    process.stdin.once('end', () =>
      resolve(dequote(Buffer.concat(bundle).toString()))
    )
    process.stdin.resume()
  })
}

/**
 * The "cli" step detects whether the process is in a tty. If it is then the input is read into memory.
 * Otherwise, it is buffered from stdin. If no input options are passed in the tty, the package.json#main file is used.
 * After all the build steps have run, the output (the executable) is written to a file or piped to stdout.
 *
 * Configuration:
 *   - compiler.options.input - file path to the input bundle.
 *     - fallbacks: stdin, package.json#main
 *   - compiler.options.output - file path to the output executable.
 *     - fallbacks: stdout, nexe_ + epoch + ext
 *
 * @param {*} compiler
 * @param {*} next
 */
module.exports.cli = function* cli (compiler, next) {
  const input = compiler.options.input,
    bundled = Boolean(compiler.input)

  if (bundled) {
    yield next()
  } else if (!input && !process.stdin.isTTY) {
    compiler.log.verbose('Buffering stdin as main module...')
    compiler.input = yield getStdIn()
  } else if (input) {
    compiler.log.verbose('Reading input as main module: ' + input)
    compiler.input = yield readFileAsync(normalize(input))
  } else if (!compiler.options.empty) {
    compiler.log.verbose('Resolving cwd as main module...')
    compiler.input = yield readFileAsync(require.resolve(process.cwd()))
  }

  if (!bundled) {
    yield next()
  }

  const deliverable = yield compiler.getDeliverableAsync()

  return new Promise((resolve, reject) => {
    deliverable.once('error', reject)

    if (!compiler.options.output && !process.stdout.isTTY) {
      compiler.log.verbose('Writing result to stdout...')
      deliverable.pipe(process.stdout).once('error', reject)
      resolve()
    } else {
      compiler.log.verbose('Writing result to file...')
      const output = compiler.options.output || `${compiler.options.name}${isWindows ? '.exe' : ''}`
      deliverable.pipe(createWriteStream(normalize(output)))
      .once('error', reject)
      .once('close', e => {
        if (e) {
          reject(e)
        } else {
          resolve(compiler.log.info('Executable written: ' + output))
        }
      })
    }
  })
}
