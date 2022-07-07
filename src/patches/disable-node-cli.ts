import type { NexeCompiler } from '../compiler.js'
import { NexeError } from '../compiler.js'

export default async function disableNodeCli(compiler: NexeCompiler, next: () => Promise<void>) {
  if (compiler.options.enableNodeCli) {
    return await next()
  }

  const replaced = await compiler.replaceInFileAsync(
    'src/node.cc',
    /(?<!int )ProcessGlobalArgs\(argv[^;]*;/gm,
    '0;/*$&*/'
  )

  if (!replaced) {
    throw new NexeError('There was an error applying the Node CLI patch. Please open an issue.')
  }

  return await next()
}
