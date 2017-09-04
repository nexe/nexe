import { compose, PromiseConfig, Middleware } from 'app-builder'
import resource from './steps/resource'
import { NexeCompiler } from './compiler'
import {
  argv,
  nexeVersion as version,
  normalizeOptionsAsync,
  NexeOptions,
  NexePatch
} from './options'
import cli from './steps/cli'
import bundle from './bundling/fuse'
import download from './steps/download'
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
  const nexe = compose(resource, bundle, cli, buildSteps)
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

export { argv, compile, version }
