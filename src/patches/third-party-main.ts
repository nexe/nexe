import { NexeCompiler } from '../compiler'
import { readFileSync } from 'fs'
import semver = require('semver')
import { join } from 'path'
import { wrap } from '../util'

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  let bootFile = 'lib/internal/bootstrap_node.js'
  const { version } = compiler.target

  if (semver.satisfies(version, '4')) {
    bootFile = 'src/node.js'
  } else if (semver.gt(version, '9.10.1')) {
    bootFile = 'lib/internal/boostrap/node.js'
  }

  const file = await compiler.readFileAsync(bootFile),
    matches = file.contents.match(/\(function.*/),
    functionHeader = matches && matches[0]

  if (!functionHeader) {
    throw new Error('Failed to find bootstrap header in node version: v' + version)
  }

  file.contents.replace(
    functionHeader,
    functionHeader + '\n' + '{{replace:lib/patches/bootstrap.js}}'
  )

  await compiler.setFileContentsAsync(
    'lib/_third_party_main.js',
    '{{replace:lib/patches/boot-nexe.js}}'
  )
  return next()
}
