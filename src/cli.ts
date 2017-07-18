import { normalize } from 'path'
import * as Bluebird from 'bluebird'
import { Readable } from 'stream'
import { createWriteStream, chmodSync } from 'fs'
import { readFileAsync, dequote, isWindows } from './util'
import { NexeCompiler } from './compiler'

function readStreamAsync(stream: NodeJS.ReadableStream): PromiseLike<string> {
  return new Bluebird(resolve => {
    let input = ''
    stream.setEncoding('utf-8')
    stream.on('data', (x: string) => {
      input += x
    })
    stream.once('end', () => resolve(dequote(input)))
    stream.resume && stream.resume()
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
export default async function cli(compiler: NexeCompiler, next: () => Promise<void>) {
  const { input, output } = compiler.options
  const { log } = compiler
  if (!input && !process.stdin.isTTY) {
    log.step('Using stdin as input')
    compiler.input = await readStreamAsync(process.stdin)
  } else if (input) {
    log.step(`Using input file as the main module: ${input}`)
    compiler.input = await readFileAsync(normalize(input), 'utf-8')
  } else if (!compiler.options.empty) {
    const bundle = require.resolve(process.cwd())
    log.step("Using the cwd's main file as the main module")
    compiler.input = await readFileAsync(bundle, 'utf-8')
  } else {
    log.step('Using empty input as the main module')
    compiler.input = ''
  }

  await next()

  const shouldPipeOutput = Boolean(!output && !process.stdout.isTTY)
  const outputName = output || `${compiler.options.name}${isWindows ? '.exe' : ''}`

  compiler.output = shouldPipeOutput ? null : outputName
  const deliverable = await compiler.compileAsync()

  return new Bluebird((resolve, reject) => {
    deliverable.once('error', reject)

    if (shouldPipeOutput) {
      log.step('Writing binary to stdout')
      deliverable.pipe(process.stdout).once('error', reject)
      resolve()
    } else if (compiler.output) {
      const step = log.step('Writing result to file')
      deliverable
        .pipe(createWriteStream(normalize(compiler.output)))
        .on('error', reject)
        .once('close', (e: Error) => {
          if (e) {
            reject(e)
          } else if (compiler.output) {
            chmodSync(compiler.output, '755')
            step.log(`Executable written to: ${compiler.output}`)
            resolve(compiler.quit())
          }
        })
    }
  })
}
