import { compose, PromiseConfig, Middleware } from 'app-builder'
import resource from './steps/resource'
import { NexeCompiler } from './compiler'
import { argv, normalizeOptionsAsync, NexeOptions, NexePatch } from './options'
import cli from './steps/cli'
import bundle from './bundling/fuse'
import download from './steps/download'
import artifacts from './steps/artifacts'
import patches from './patches'
import { rimrafAsync } from './util'

async function compile(
  compilerOptions?: Partial<NexeOptions>,
  callback?: (err: Error | null) => void
) {
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

  const buildSteps = build
    ? [download, artifacts, ...patches, ...(options.patches as NexePatch[])]
    : []
  const nexe = compose(resource, bundle, cli, buildSteps)
  return callback
    ? void nexe(compiler).then(() => callback && callback(null)).catch((e: Error) => {
        if (callback) {
          callback(e)
        } else throw e
      })
    : nexe(compiler)
}

export { argv, compile }
