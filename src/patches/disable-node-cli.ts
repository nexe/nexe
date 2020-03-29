import { NexeCompiler } from '../compiler'
import { semverGt } from '../util'

export default async function disableNodeCli(compiler: NexeCompiler, next: () => Promise<void>) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  if (semverGt(compiler.target.version, '11.6.0')) {
    await compiler.replaceInFileAsync(
      'src/node.cc',
      /(?<!int )ProcessGlobalArgs\(argv[^;]*;/gm,
      '0;/*$&*/'
    )
  } else if (semverGt(compiler.target.version, '10.9')) {
    await compiler.replaceInFileAsync('src/node.cc', /(?<!void )ProcessArgv\(argv/g, '//$&')
  } else if (semverGt(compiler.target.version, '9.999')) {
    await compiler.replaceInFileAsync(
      'src/node.cc',
      'int i = 1; i < v8_argc; i++',
      'int i = v8_argc; i < v8_argc; i++'
    )
    let matches = 0
    await compiler.replaceInFileAsync('src/node.cc', /v8_argc > 1/g, match => {
      if (matches++) {
        return 'false'
      }
      return match
    })
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
