import { readFileAsync, isDirectoryAsync, each } from '../util'
import { Buffer } from 'buffer'
import * as globs from 'globby'
import { NexeCompiler } from '../compiler'

export default async function resource(compiler: NexeCompiler, next: () => Promise<void>) {
  const resources = compiler.resources

  if (!compiler.options.resources.length) {
    return next()
  }
  const step = compiler.log.step('Bundling Resources...')
  let count = 0
  await each(globs(compiler.options.resources), async file => {
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
  step.log(
    `Included ${count} file(s). ${(Buffer.byteLength(resources.bundle) / 1e6).toFixed(3)} MB`
  )
  return next()
}
