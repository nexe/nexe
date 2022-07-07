import { NexeCompiler } from './compiler.js'
import type { NexeOptions, NexePatch } from './options.js'
import { normalizeOptions } from './options.js'

import resource from './steps/resource.js'
import clean from './steps/clean.js'
import cli from './steps/cli.js'
import bundle from './steps/bundle.js'
import download from './steps/download.js'
import shim from './steps/shim.js'
import artifacts from './steps/artifacts.js'
import patches from './patches/index.js'
import { initEsm } from './util.js'

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
export { argv, version, help } from './options.js'
export type { NexeOptions } from './options.js'

function exec<T>(mw: any[], ctx: T): Promise<void> | void {
  let i = -1
  const nxt = (): void | Promise<void> => {
    if (++i < mw.length) {
      return mw[i](ctx, nxt)
    }
  }
  return nxt()
}
