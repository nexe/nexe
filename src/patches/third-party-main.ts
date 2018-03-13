import { NexeCompiler } from '../compiler'
import { readFileSync } from 'fs'
import { join } from 'path'
import { wrap } from '../util'

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  const bootPath =
    (compiler.target.version.startsWith('4') ? 'src/' : 'lib/internal/bootstrap_') + 'node.js'
  const file = await compiler.readFileAsync(bootPath)
  const parts = file.contents.split('function(process) {')
  file.contents =
    parts[0] + `function(process) {` + '{{replace:lib/patches/bootstrap.js}}' + parts[1]

  await compiler.setFileContentsAsync(
    'lib/_third_party_main.js',
    '{{replace:lib/patches/boot-nexe.js}}'
  )
  return next()
}
