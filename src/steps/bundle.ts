import { NexeCompiler, NexeError } from '../compiler'
import { resolve, relative } from 'path'
import { each } from '@calebboyd/semaphore'
import resolveFiles, { resolveSync } from 'resolve-dependencies'
import { dequote, STDIN_FLAG, semverGt } from '../util'
import { Readable } from 'stream'

function getStdIn(stdin: Readable): Promise<string> {
  let out = ''
  return new Promise((resolve) => {
    stdin
      .setEncoding('utf8')
      .on('readable', () => {
        let current
        while ((current = stdin.read())) {
          out += current
        }
      })
      .on('end', () => resolve(out.trim()))
    setTimeout(() => {
      if (!out.trim()) {
        resolve(out.trim())
      }
    }, 1000)
  })
}

export default async function bundle(compiler: NexeCompiler, next: any) {
  const { bundle, cwd, input: inputPath } = compiler.options
  let input = inputPath
  compiler.entrypoint = './' + relative(cwd, input)

  if (semverGt(compiler.target.version, '11.99')) {
    compiler.startup = ''
  } else {
    compiler.startup = ';require("module").runMain();'
  }

  if (!bundle) {
    await compiler.addResource(resolve(cwd, input))
    return next()
  }

  let code = ''
  if (typeof bundle === 'string') {
    code = await require(bundle).createBundle(compiler.options)
  }

  if (input === STDIN_FLAG && (code = code || dequote(await getStdIn(process.stdin)))) {
    compiler.stdinUsed = true
    compiler.entrypoint = './__nexe_stdin.js'
    await compiler.addResource(resolve(cwd, compiler.entrypoint), code)
    return next()
  }

  if (input === STDIN_FLAG) {
    const maybeInput = resolveSync(cwd, '.')
    if (!maybeInput || !maybeInput.absPath) {
      throw new NexeError('No valid input detected')
    }
    input = maybeInput.absPath
    compiler.entrypoint = './' + relative(cwd, input)
  }

  const { files, warnings } = await resolveFiles(
    input,
    ...Object.keys(compiler.bundle.index).filter((x) => x.endsWith('.js')),
    { cwd, expand: 'variable', loadContent: false }
  )

  if (
    warnings.filter((x) => x.startsWith('Error parsing file') && !x.includes('node_modules')).length
  ) {
    throw new NexeError('Parsing Error:\n' + warnings.join('\n'))
  }

  await each(Object.keys(files), (filename: string) => compiler.addResource(filename), {
    concurrency: 10,
  })
  return next()
}
