import { NexeCompiler, NexeError } from '../compiler'
import { resolve, relative } from 'path'
import { each } from '@calebboyd/semaphore'
import resolveFiles from 'resolve-dependencies'
import { dequote, STDIN_FLAG } from '../util'
import { Readable } from 'stream'

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

export default async function bundle(compiler: NexeCompiler, next: any) {
  const { bundle, cwd, input } = compiler.options
  compiler.entrypoint = './' + relative(cwd, input)
  compiler.startup = ';require("module").runMain();'

  if (!bundle) {
    await compiler.addResource(resolve(cwd, input))
    return next()
  }

  let code = ''
  if (typeof bundle === 'string') {
    code = await require(bundle).createBundle(compiler.options)
  }

  if (input === STDIN_FLAG) {
    compiler.stdinUsed = true
    compiler.entrypoint = './__nexe_stdin.js'
    code = code || dequote(await getStdIn(process.stdin))
    await compiler.addResource(resolve(cwd, compiler.entrypoint), code)
    return next()
  }

  const { files, warnings } = await resolveFiles(
    input,
    ...Object.keys(compiler.bundle.index).filter(x => x.endsWith('.js')),
    { cwd, expand: true, loadContent: false }
  )

  if (
    warnings.filter(x => x.startsWith('Error parsing file') && !x.includes('node_modules')).length
  ) {
    throw new NexeError('Parsing Error:\n' + warnings.join('\n'))
  }

  await each(Object.keys(files), (filename: string) => compiler.addResource(filename), {
    concurrency: 10
  })
  return next()
}
