import { NexeCompiler } from '../compiler'
import { rimrafAsync } from '../util'
import { NexeTarget } from '../target'

export default async function clean(compiler: NexeCompiler, next: () => Promise<any>) {
  const { options } = compiler
  if (options.clean) {
    let path = compiler.src
    if (!options.build) {
      path = compiler.getNodeExecutableLocation(compiler.options.targets[0] as NexeTarget)
    }
    const step = compiler.log.step('Cleaning up nexe build artifacts...')
    step.log(`Deleting contents at: ${path}`)
    await rimrafAsync(path)
    step.log(`Deleted contents at: ${path}`)
    return compiler.quit()
  }
  return next()
}
