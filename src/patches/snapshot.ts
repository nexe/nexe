import { resolve } from 'path'
import { NexeCompiler } from '../compiler'

export default async function(compiler: NexeCompiler, next: () => Promise<void>) {
  const { snapshot, warmup, cwd } = compiler.options

  if (!snapshot) {
    return next()
  }

  await compiler.replaceInFileAsync(
    compiler.configureScript,
    'def configure_v8(o):',
    `def configure_v8(o):\n  o['variables']['embed_script'] = r'${resolve(
      cwd,
      snapshot
    )}'\n  o['variables']['warmup_script'] = r'${resolve(cwd, warmup || snapshot)}'`
  )

  return next()
}
