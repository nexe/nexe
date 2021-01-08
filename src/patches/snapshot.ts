import { resolve } from 'path'
import { NexeCompiler } from '../compiler'
import { semverGt } from '../util'

export default async function (compiler: NexeCompiler, next: () => Promise<void>) {
  const { snapshot, warmup, cwd } = compiler.options

  if (!snapshot) {
    return next()
  }

  const variablePrefix = semverGt(compiler.target.version, '11.0.0') ? 'v8_' : ''

  await compiler.replaceInFileAsync(
    compiler.configureScript,
    'def configure_v8(o):',
    `def configure_v8(o):\n  o['variables']['${variablePrefix}embed_script'] = r'${resolve(
      cwd,
      snapshot
    )}'\n  o['variables']['${variablePrefix}warmup_script'] = r'${resolve(
      cwd,
      warmup || snapshot
    )}'`
  )

  return next()
}
