import { EOL } from 'os'
import { compose, Middleware } from 'app-builder'
import { rimrafAsync } from './util'
import { NexeTarget } from './target'
import { NexeCompiler } from './compiler'
import { normalizeOptions, NexeOptions, NexePatch } from './options'
import resource from './steps/resource'
import cli from './steps/cli'
import bundle from './steps/bundle'
import download from './steps/download'
import shim from './steps/shim'
import artifacts from './steps/artifacts'
import patches from './patches'

async function compile(
  compilerOptions?: Partial<NexeOptions>,
  callback?: (err: Error | null) => void
) {
  const options = normalizeOptions(compilerOptions)
  const compiler = new NexeCompiler(options)
  const build = compiler.options.build

  if (options.clean) {
    let path = compiler.src
    if (!options.build) {
      path = compiler.getNodeExecutableLocation(compiler.options.targets[0] as NexeTarget)
    }
    const step = compiler.log.step('Cleaning up nexe build artifacts...')
    step.log(`Deleting contents at: ${path}`)
    await rimrafAsync(path)
    step.log(`Deleted contents at: ${path}`)
    return compiler.quit()
  }

  const buildSteps = build
    ? [download, artifacts, ...patches, ...(options.patches as NexePatch[])]
    : []
  const nexe = compose(resource, bundle, shim, cli, buildSteps, options.plugins as NexePatch[])
  let error = null

  try {
    await nexe(compiler)
  } catch (e) {
    error = e
  }

  if (error) {
    if (compiler.options.loglevel !== 'silent' && error) {
      process.stderr.write(EOL + error.stack + EOL)
    }
    compiler.quit()
    if (callback) return callback(error)
    return Promise.reject(error)
  }
  if (callback) callback(null)
}

export { compile, NexeCompiler }
export { argv, version, NexeOptions, help } from './options'
