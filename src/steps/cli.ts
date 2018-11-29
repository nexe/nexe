import { normalize, relative } from 'path'
import { createWriteStream, chmodSync, statSync } from 'fs'
import { NexeCompiler } from '../compiler'
import { NexeTarget } from '../target'
import { STDIN_FLAG } from '../util'

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
  const { log } = compiler
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
              compiler.stdinUsed ? (compiler.options.mangle ? STDIN_FLAG : '[none]') : inputFile
            }' written to: ${outputFile}`
          )
          resolve(compiler.quit())
        }
      })
  })
}
