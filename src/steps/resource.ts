import { readFileAsync, isDirectoryAsync, each } from '../util'
import { Buffer } from 'buffer'
import * as globs from 'globby'
import { NexeCompiler } from '../compiler'

export default async function resource(compiler: NexeCompiler, next: () => Promise<any>) {
  const resources = compiler.resources
  const { cwd } = compiler.options

  if (!compiler.options.resources.length) {
    return next()
  }
  const step = compiler.log.step('Bundling Resources...')
  let count = 0
  await each(globs(compiler.options.resources, { cwd }), async file => {
    if (await isDirectoryAsync(file)) {
      return
    }
    count++
    step.log(`Including file: ${file}`)
    const contents = await readFileAsync(file)
    compiler.addResource(file, contents)
  })
  step.log(`Included ${count} file(s). ${(resources.bundle.byteLength / 1e6).toFixed(3)} MB`)
  return next()
}
