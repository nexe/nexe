import { compose, PromiseConfig } from 'app-builder'
import bundle from './bundle'
import resource from './resource'
import { NexeCompiler } from './compiler'
import { argv, normalizeOptionsAsync } from './options'
import cli from './cli'
import download from './download'
import artifacts from './artifacts'
import patches from './patches'
import { rimrafAsync } from './util'
import Bluebird from 'bluebird'

PromiseConfig.constructor = Bluebird

async function compile (compilerOptions, callback) {
  const options = await normalizeOptionsAsync(compilerOptions)
  const compiler = new NexeCompiler(options)
  const build = compiler.options.build

  if (options.clean) {
    const step = compiler.log.step('Cleaning up nexe build artifacts...')
    step.log(`Deleting directory and contents at: ${compiler.src}`)
    await rimrafAsync(compiler.src)
    step.log(`Deleted directory and contents at: ${compiler.src}`)
    return compiler.quit()
  }

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

export {
  argv,
  compile
}
