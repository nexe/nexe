import { normalize, relative, resolve } from 'path'
import { createWriteStream, chmodSync, statSync } from 'fs'
import { dequote } from '../util'
import { Readable } from 'stream'
import { NexeCompiler } from '../compiler'
import { NexeTarget } from '../target'

function getStdIn(stdin: Readable): Promise<string> {
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
    compiler.entrypoint = './__nexe_stdin.js'
    const code = dequote(await getStdIn(process.stdin))
    await compiler.addResource(resolve(compiler.options.cwd, compiler.entrypoint), code)
  } else {
    compiler.entrypoint = './' + relative(compiler.options.cwd, compiler.options.input)
  }
  compiler.startup = ';require("module").runMain();'
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
          const output = compiler.output
          const mode = statSync(output).mode | 0o111
          chmodSync(output, mode.toString(8).slice(-3))
          const inputFile = relative(process.cwd(), compiler.options.input)
          const outputFile = relative(process.cwd(), output)
          step.log(
            `Entry: '${
              stdInUsed ? (compiler.options.mangle ? '[stdin]' : '[none]') : inputFile
            }' written to: ${outputFile}`
          )
          resolve(compiler.quit())
        }
      })
  })
}
