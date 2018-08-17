import { NexeCompiler } from '../compiler'
import { resolve } from 'path'
import { each } from '@calebboyd/semaphore'
import resolveFiles from 'resolve-dependencies'

export default async function bundle(compiler: NexeCompiler, next: any) {
  const { bundle, cwd, input } = compiler.options
  if (!bundle) {
    await compiler.addResource(resolve(cwd, input))
    return next()
  }

  if (!input) {
    return next()
  }

  const { files } = await resolveFiles(input, { cwd, expand: true, loadContent: false })
  await each(Object.keys(files), (filename: string) => compiler.addResource(filename), {
    concurrency: 10
  })
  return next()
}
