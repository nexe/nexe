import { compose, Middleware } from 'app-builder'
import resource from './steps/resource'
import { NexeCompiler } from './compiler'
import { argv, version, help, normalizeOptionsAsync, NexeOptions, NexePatch } from './options'
import cli from './steps/cli'
import bundle from './steps/bundle'
import download from './steps/download'
import shim from './steps/shim'
import artifacts from './steps/artifacts'
import patches from './patches'
import { rimrafAsync } from './util'
import { NexeTarget } from './target'

async function compile(
  compilerOptions?: Partial<NexeOptions>,
  callback?: (err: Error | null) => void
) {
  const options = await normalizeOptionsAsync(compilerOptions)
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
  const nexe = compose(resource, bundle, cli, buildSteps, shim, options.plugins as NexePatch[])
  return callback
    ? void nexe(compiler).then(
        () => callback && callback(null),
        (e: Error) => {
          if (callback) callback(e)
          else throw e
        }
      )
    : nexe(compiler)
}

export { argv, compile, version, NexeCompiler, NexeOptions, help }
