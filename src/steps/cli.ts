import { dirname, normalize, relative, resolve } from 'node:path'
import { createWriteStream, chmodSync, statSync, mkdirSync } from 'node:fs'
import type { NexeCompiler } from '../compiler.js'
import type { NexeTarget } from '../target.js'
import { STDIN_FLAG } from '../util.js'

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
    output = normalize(compiler.output)

  mkdirSync(dirname(output), { recursive: true })

  return await new Promise((res, rej) => {
    const step = log.step('Writing result to file')
    deliverable
      .pipe(createWriteStream(output))
      .on('error', rej)
      .once('close', (e: Error) => {
        if (e) {
          rej(e)
        } else if (compiler.output) {
          const output = compiler.output,
            mode = statSync(output).mode | 0o111,
            inputFileLogOutput = relative(
              process.cwd(),
              resolve(compiler.options.cwd, compiler.entrypoint || compiler.options.input)
            ),
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
          compiler.quit()
          res(output)
        }
      })
  })
}
