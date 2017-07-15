import { NexeCompiler } from '../compiler'

export default async function disableNodeCli(compiler: NexeCompiler, next: () => Promise<void>) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  const nodeccMarker = "argv[index][0] == '-'"

  await compiler.replaceInFileAsync('src/node.cc', nodeccMarker, nodeccMarker.replace('-', ']'))
  return next()
}
