import { normalize } from 'path'
import { Readable } from 'stream'
import { createWriteStream, chmodSync } from 'fs'
import { readFileAsync, dequote, isWindows } from '../util'
import { NexeCompiler } from '../compiler'
import { NexeTarget } from '../target'

function readStreamAsync(stream: NodeJS.ReadableStream): PromiseLike<string> {
  return new Promise(resolve => {
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
 * The "cli" step detects the appropriate input. If no input options are passed,
 * the package.json#main file is used.
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
  const { log } = compiler
  let stdInUsed = false
  if (!process.stdin.isTTY) {
    stdInUsed = true
    compiler.input = await readStreamAsync(process.stdin)
  }

  await next()

  log.step(`Bundling: '${stdInUsed ? '[stdin]' : compiler.options.input}'`)

  const target = compiler.options.targets.shift() as NexeTarget
  const deliverable = await compiler.compileAsync(target)

  return new Promise((resolve, reject) => {
    const step = log.step('Writing result to file')
    deliverable
      .pipe(createWriteStream(normalize(compiler.output!)))
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
  })
}
