import { NexeCompiler } from '../compiler'
import { readFileSync } from 'fs'
import { join } from 'path'

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  await compiler.setFileContentsAsync(
    'lib/_third_party_main.js',
    '{{replace:lib/patches/boot-nexe.js}}'
  )
  return next()
}
