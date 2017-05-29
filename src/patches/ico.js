import { normalize } from 'path'
import { readFileAsync } from '../util'

export default async function ico (compiler, next) {
  const iconFile = compiler.options.ico
  if (!iconFile) {
    return next()
  }
  await compiler.setFileContentsAsync(
    'src/res/node.ico',
    await readFileAsync(normalize(iconFile))
  )
  return next()
}
