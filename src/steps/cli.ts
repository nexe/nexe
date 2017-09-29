import { normalize } from 'path'
import { Readable } from 'stream'
import { createWriteStream, chmodSync } from 'fs'
import { readFileAsync, dequote, isWindows } from '../util'
import { NexeCompiler } from '../compiler'
import { NexeTarget } from '../target'

function getStdIn(stdin: NodeJS.ReadStream): Promise<string> {
  return new Promise(resolve => {
    let out = ''
    stdin
      .setEncoding('utf8')
      .on('readable', () => {
        let current
        while ((current = stdin.read())) {
          out += current
        }
      })
      .on('end', () => resolve(out))
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
  if (!process.stdin.isTTY && compiler.options.enableStdIn) {
    stdInUsed = true
    compiler.input = await getStdIn(process.stdin)
  }

  await next()

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
          chmodSync(compiler.output, '755') //todo fix erroneous rw mode change
          step.log(
            `Entry: '${stdInUsed
              ? compiler.options.empty ? '[empty]' : '[stdin]'
              : compiler.options.input}' written to: ${compiler.output}`
          )
          resolve(compiler.quit())
        }
      })
  })
}
