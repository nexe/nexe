import { normalize } from 'path'
import { readFileAsync } from '../util'
import { NexeCompiler } from '../compiler'

export default async function ico(compiler: NexeCompiler, next: () => Promise<void>) {
  const iconFile = compiler.options.ico
  if (!iconFile) {
    return next()
  }
  await compiler.setFileContentsAsync('src/res/node.ico', await readFileAsync(normalize(iconFile)))
  return next()
}
