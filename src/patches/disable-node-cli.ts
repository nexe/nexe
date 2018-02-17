import { NexeCompiler } from '../compiler'

export default async function disableNodeCli(compiler: NexeCompiler, next: () => Promise<void>) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  const nodeccMarker = 'argv[index][0] =='

  await compiler.replaceInFileAsync(
    'src/node.cc',
    `${nodeccMarker} '-'`,
    // allow NODE_OPTIONS, introduced in 8.0
    parseInt(compiler.target.version.split('.')[0]) >= 8
      ? `(${nodeccMarker} (is_env ? '-' : ']'))`
      : `(${nodeccMarker} ']')`
  )

  return next()
}
