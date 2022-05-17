import { NexeCompiler, NexeError } from '../compiler'

export default async function flags(compiler: NexeCompiler, next: () => Promise<void>) {
  const nodeflags = compiler.options.flags
  if (nodeflags.length === 0) {
    return await next()
  }

  const replaced = await compiler.replaceInFileAsync(
    'node.gyp',
    "'node_v8_options%': ''",
    `'node_v8_options%': '${nodeflags.join(' ')}'`
  )

  if (!replaced) {
    throw new NexeError('Node Flags not applied. Please report an issue')
  }

  return await next()
}
