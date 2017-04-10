import { compose } from 'app-builder'
import { bundle } from './bundle'
import { NexeCompiler } from './compiler'
import { argv } from './options'
import { cli } from './cli'
import { download } from './download'
import { artifacts } from './artifacts'
import { patches } from './patches'
import { EOL } from 'os'
import { longStackTraces, Promise } from 'bluebird'
import { error } from './logger'

longStackTraces()

export function compile (compilerOptions, callback) {
  const compiler = new NexeCompiler(compilerOptions)

  compiler.log.verbose('Compiler options:' +
    EOL + JSON.stringify(compiler.options, null, 4)
  )

  const nexe = compose(
    bundle,
    cli,
    download,
    (nexeCompiler, next) => {
      return next().then(() => {
        return nexeCompiler.buildAsync()
      })
    },
    artifacts,
    patches,
    compiler.options.patches
  )
  return Promise.resolve(nexe(compiler)).asCallback(callback)
}

export function isNexe (callback) {
  return Promise.resolve(Boolean(process.__nexe)).asCallback(callback)
}

export {
  argv
}

if (require.main === module || process.__nexe) {
  compile(argv).catch((e) => {
    error(e.stack, () => process.exit(1))
  })
}
