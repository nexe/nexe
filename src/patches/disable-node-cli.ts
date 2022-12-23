import type { NexeCompiler } from '../compiler.js'
import { NexeError } from '../compiler.js'
import { semverGt } from '../util.js'

export default async function disableNodeCli(compiler: NexeCompiler, next: () => Promise<void>) {
  if (compiler.options.enableNodeCli) {
    return await next()
  }

  const [regex, replacement] = semverGt(compiler.target.version, '18.99')
      ? [/(?<!int )ProcessGlobalArgsInternal\(argv[^;]*;/gm, 'ExitCode::kNoFailure']
      : [/(?<!int )ProcessGlobalArgs\(argv[^;]*;/gm, 0],
    replaced = await compiler.replaceInFileAsync('src/node.cc', regex, `${replacement};/*$&*/`)

  if (!replaced) {
    throw new NexeError('There was an error applying the Node CLI patch. Please open an issue.')
  }

  return await next()
}
