import { normalize } from 'path'
import { readFileAsync } from '../util'

export default async function ico (compiler, next) {
  const iconFile = compiler.options.ico
  if (!iconFile) {
    return next()
  }
  const file = await compiler.readFileAsync('src/res/node.ico')
  file.contents = await readFileAsync(normalize(iconFile))
  return next()
}
