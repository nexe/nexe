import { compose, PromiseConfig } from 'app-builder'
import bundle from './bundle'
import resource from './resource'
import { NexeCompiler } from './compiler'
import { argv, normalizeOptionsAsync } from './options'
import cli from './cli'
import download from './download'
import artifacts from './artifacts'
import patches from './patches'
import { EOL } from 'os'
import Bluebird from 'bluebird'
import logger from './logger'

PromiseConfig.constructor = Bluebird
Bluebird.longStackTraces()

async function compile (compilerOptions, callback) {
  const options = await normalizeOptionsAsync(compilerOptions)
  const compiler = new NexeCompiler(options)
  const build = compiler.options.build

  compiler.log.verbose('Compiler options:' +
    EOL + JSON.stringify(compiler.options, null, 4)
  )

  const nexe = compose(...[
    resource,
    bundle,
    cli,
    build && download,
    build && artifacts,
    build && patches,
    build && options.patches
  ].filter(x => x))
  return nexe(compiler).asCallback(callback)
}

function isNexe () {
  return Boolean(process.__nexe)
}

export {
  argv,
  isNexe,
  compile
}

if (process.__nexe) {
  compile(argv)
    .catch((e) => {
      logger.error(e.stack, () => process.exit(e.exitCode || 1))
    })
}
