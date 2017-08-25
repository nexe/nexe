import { compose, PromiseConfig, Middleware } from 'app-builder'
import resource from './resource'
import { NexeCompiler } from './compiler'
import { argv, normalizeOptionsAsync, NexeOptions } from './options'
import cli from './cli'
import bundle from './bundling/fuse'
import download from './download'
import artifacts from './artifacts'
import patches from './patches'
import { rimrafAsync } from './util'
import * as Bluebird from 'bluebird'

PromiseConfig.constructor = Bluebird

async function compile(compilerOptions: NexeOptions, callback?: (err: Error | null) => void) {
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

  const buildSteps = build ? [download, artifacts, ...patches, ...options.patches] : []
  const nexe = compose(resource, bundle, cli, buildSteps)
  return nexe(compiler).asCallback(callback)
}

export { argv, compile }
