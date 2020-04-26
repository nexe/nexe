import { isDirectoryAsync, each } from '../util'
import * as globs from 'globby'
import { NexeCompiler } from '../compiler'

export default async function resource(compiler: NexeCompiler, next: () => Promise<any>) {
  const { cwd, resources } = compiler.options
  if (!resources.length) {
    return next()
  }
  const step = compiler.log.step('Bundling Resources...')
  let count = 0

  // workaround for https://github.com/sindresorhus/globby/issues/127
  // and https://github.com/mrmlnc/fast-glob#pattern-syntax
  const resourcesWithForwardSlashes = resources.map((r) => r.replace(/\\/g, '/'))

  await each(globs(resourcesWithForwardSlashes, { cwd }), async (file) => {
    if (await isDirectoryAsync(file)) {
      return
    }
    count++
    step.log(`Including file: ${file}`)
    await compiler.addResource(file)
  })
  step.log(`Included ${count} file(s). ${(compiler.resourceSize / 1e6).toFixed(3)} MB`)
  return next()
}
