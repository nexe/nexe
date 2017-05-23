import { normalize } from 'path'
import Bluebird from 'bluebird'
import { createWriteStream } from 'fs'
import { readFileAsync, readStreamAsync, isWindows } from './util'

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
export default async function cli (compiler, next) {
  const input = compiler.options.input
  const bundled = Boolean(compiler.input)

  if (bundled) {
    await next()
  } else if (!input && !process.stdin.isTTY) {
    compiler.log.verbose('Buffering stdin as bundle...')
    compiler.input = await readStreamAsync(process.stdin)
  } else if (input) {
    compiler.log.verbose('Reading input as bundle: ' + input)
    compiler.input = await readFileAsync(normalize(input))
  } else if (!compiler.options.empty) {
    const bundle = require.resolve(process.cwd())
    compiler.log.verbose('Resolving cwd as main bundle: ' + bundle)
    compiler.input = await readFileAsync(bundle)
  }

  if (!bundled) {
    await next()
  }

  const shouldPipeOutput = Boolean(!compiler.options.output && !process.stdout.isTTY)
  const outputName = compiler.options.output ||
    `${compiler.options.name}${isWindows ? '.exe' : ''}`

  compiler.output = shouldPipeOutput ? null : outputName
  const deliverable = await compiler.compileAsync()

  return new Bluebird((resolve, reject) => {
    deliverable.once('error', reject)

    if (!compiler.output) {
      compiler.log.verbose('Writing result to stdout...')
      deliverable.pipe(process.stdout).once('error', reject)
      resolve()
    } else {
      compiler.log.verbose('Writing result to file...')
      deliverable.pipe(createWriteStream(normalize(compiler.output)))
        .once('error', reject)
        .once('close', e => {
          if (e) {
            reject(e)
          } else {
            compiler.log.info('Executable written: ' + compiler.output, resolve)
          }
        })
    }
  })
}
