import { each } from 'bluebird'
import { readFileAsync, isDirectoryAsync } from './util'
import { Buffer } from 'buffer'
import globs from 'globby'

export default async function resource (compiler, next) {
  const resources = compiler.resources = {
    index: {},
    bundle: ''
  }

  if (!compiler.options.resources.length) {
    return next()
  }
  const step = compiler.log.step('Bundling Resources...')
  let count = 0
  await each(globs(compiler.options.resources), async (file) => {
    if (await isDirectoryAsync(file)) {
      return
    }
    count++
    step.log(`Including file: ${file}`)
    const contents = await readFileAsync(file)
    const commentSafeContents = contents.toString('base64')
    resources.index[file] = [
      Buffer.byteLength(resources.bundle),
      Buffer.byteLength(commentSafeContents)
    ]
    resources.bundle += commentSafeContents
  })
  step.log(`Included ${count} file(s). ${(Buffer.byteLength(resources.bundle) / 1e6).toFixed(3)} MB`)
  return next()
}
