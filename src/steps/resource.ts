import { relative } from 'node:path'

import fg from 'fast-glob'

import { each } from '../util'
import { NexeCompiler } from '../compiler'

export default async function resource(compiler: NexeCompiler, next: () => Promise<any>) {
  const { cwd, resources } = compiler.options
  if (resources.length === 0) {
    return await next()
  }
  let count = 0

  resources.forEach((x: string) => {
    if (x.includes('node_modules/**')) {
      compiler.log.step(
        `[WARNING]: pattern "${x}" will include many files, consider narrowing the pattern`,
        'stopAndPersist',
        'yellow'
      )
    }
  })

  const step = compiler.log.step('Bundling Resources...')

  await each(fg(resources, { cwd, absolute: true, onlyFiles: true }), async (file) => {
    count++
    step.log(`Including file: ${relative(cwd, file)}`)
    await compiler.addResource(file)
  })
  compiler.log.step(`Included ${count} file(s)`, 'stopAndPersist')
  return await next()
}
