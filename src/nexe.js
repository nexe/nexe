import { compose, PromiseConfig } from 'app-builder'
import bundle from './bundle'
import { NexeCompiler } from './compiler'
import { argv, normalizeOptionsAsync } from './options'
import cli from './cli'
import download from './download'
import artifacts from './artifacts'
import patches from './patches'
import { EOL } from 'os'
import { longStackTraces, Promise } from 'bluebird'
import { error } from './logger'

PromiseConfig.constructor = Promise
longStackTraces()

async function compile (compilerOptions, callback) {
  const options = await normalizeOptionsAsync(compilerOptions)
  const compiler = new NexeCompiler(options)

  compiler.log.verbose('Compiler options:' +
    EOL + JSON.stringify(compiler.options, null, 4)
  )

  const nexe = compose(
    bundle,
    cli,
    download,
    async (_, next) => {
      await next()
      return compiler.buildAsync()
    },
    artifacts,
    patches,
    compiler.options.patches
  )
  return nexe(compiler).asCallback(callback)
}

function isNexe (callback) {
  return Promise.resolve(Boolean(process.__nexe)).asCallback(callback)
}

export {
  argv,
  isNexe,
  compile
}

if (require.main === module || process.__nexe) {
  compile(argv)
    .catch((e) => {
      error(e.stack, () => process.exit(e.exitCode || 1))
    })
}
