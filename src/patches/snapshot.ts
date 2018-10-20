import * as path from 'path'
import { NexeCompiler } from '../compiler'

export default async function snapshot(compiler: NexeCompiler, next: () => Promise<void>) {
  const snapshotFile = compiler.options.snapshot
  const warmupScript = compiler.options.warmup

  if (!snapshotFile) {
    return next()
  }

  await compiler.replaceInFileAsync(
    'configure',
    'def configure_v8(o):',
    `def configure_v8(o):\n  o['variables']['embed_script'] = r'${path.resolve(snapshotFile)}'\n  o['variables']['warmup_script'] = r'${path.resolve(warmupScript ||
      snapshotFile)}'`
  )

  return next()
}
