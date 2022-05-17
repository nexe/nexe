import { NexeCompiler } from './compiler'
import { normalizeOptions, NexeOptions, NexePatch } from './options'

import resource from './steps/resource'
import clean from './steps/clean'
import cli from './steps/cli'
import bundle from './steps/bundle'
import download from './steps/download'
import shim from './steps/shim'
import artifacts from './steps/artifacts'
import patches from './patches'
import { initEsm } from './util'

async function compile(
  compilerOptions?: Partial<NexeOptions>,
  callback?: (err: Error | null) => void
) {
  await initEsm()
  let error: Error | null = null,
    options: NexeOptions | null = null,
    compiler: NexeCompiler | null = null

  try {
    options = normalizeOptions(compilerOptions)
    compiler = new NexeCompiler(options)
    const plugins = options.plugins as NexePatch[],
      buildSteps = options.build ? [artifacts, ...patches, ...(options.patches as NexePatch[])] : []
    await exec([clean, resource, cli, bundle, shim, download, ...buildSteps, ...plugins], compiler)
  } catch (e: any) {
    error = e
  }

  if (error) {
    compiler?.quit(error)
    if (callback) return callback(error)
    throw error
  }

  if (callback) callback(null)
}

export { compile, NexeCompiler }
export { argv, version, NexeOptions, help } from './options'

function exec<T>(mw: any[], ctx: T): Promise<void> | void {
  let i = -1
  const nxt = (): void | Promise<void> => {
    if (++i < mw.length) {
      return mw[i](ctx, nxt)
    }
  }
  return nxt()
}
