import { dirname, normalize, relative } from 'path'
import { createWriteStream, chmodSync, statSync } from 'fs'
import { NexeCompiler } from '../compiler'
import { NexeTarget } from '../target'
import { STDIN_FLAG } from '../util'
import mkdirp = require('mkdirp')

/**
 * The "cli" step detects the appropriate input. If no input options are passed,
 * the package.json#main file is used.
 * After all the build steps have run, the output (the executable) is written to a file or piped to stdout.
 *
 * Configuration:
 *
 * @param {*} compiler
 * @param {*} next
 */
export default async function cli(compiler: NexeCompiler, next: () => Promise<void>) {
  await next()
  const { log } = compiler,
    target = compiler.options.targets.shift() as NexeTarget,
    deliverable = await compiler.compileAsync(target),
    output = normalize(compiler.output!)

  mkdirp.sync(dirname(output))

  return new Promise((resolve, reject) => {
    const step = log.step('Writing result to file')
    deliverable
      .pipe(createWriteStream(output))
      .on('error', reject)
      .once('close', (e: Error) => {
        if (e) {
          reject(e)
        } else if (compiler.output) {
          const output = compiler.output,
            mode = statSync(output).mode | 0o111,
            inputFileLogOutput = relative(process.cwd(), compiler.options.input),
            outputFileLogOutput = relative(process.cwd(), output)

          chmodSync(output, mode.toString(8).slice(-3))
          step.log(
            `Entry: '${
              compiler.stdinUsed
                ? compiler.options.mangle
                  ? STDIN_FLAG
                  : '[none]'
                : inputFileLogOutput
            }' written to: ${outputFileLogOutput}`
          )
          resolve(compiler.quit())
        }
      })
  })
}
