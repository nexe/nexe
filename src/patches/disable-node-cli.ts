import { NexeCompiler } from '../compiler'
import { semverGt } from '../util'

export default async function disableNodeCli(compiler: NexeCompiler, next: () => Promise<void>) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  if (semverGt(compiler.target.version, '9.99')) {
    await compiler.replaceInFileAsync('src/node.cc', /(?<!void )ProcessArgv\(/g, '//ProcessArgv(')
  } else {
    const nodeccMarker = 'argv[index][0] =='

    await compiler.replaceInFileAsync(
      'src/node.cc',
      `${nodeccMarker} '-'`,
      // allow NODE_OPTIONS, introduced in 8.0
      semverGt(compiler.target.version, '7.99')
        ? `(${nodeccMarker} (is_env ? '-' : ']'))`
        : `(${nodeccMarker} ']')`
    )
  }

  return next()
}
