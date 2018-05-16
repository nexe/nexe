import { NexeCompiler } from '../compiler'
import { readFileSync } from 'fs'
import { join } from 'path'
import { wrap } from '../util'

function semverGt(version: string, operand: string) {
  const [cMajor, cMinor, cPatch] = version.split('.').map(Number)
  const [major, minor, patch] = operand.split('.').map(Number)

  return (
    cMajor > major ||
    (cMajor === major && cMinor > minor) ||
    (cMajor === major && cMinor === minor && cPatch > patch)
  )
}

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  let bootFile = 'lib/internal/bootstrap_node.js'
  const { version } = compiler.target

  if (version.startsWith('4.')) {
    bootFile = 'src/node.js'
  } else if (semverGt(version, '9.10.1')) {
    bootFile = 'lib/internal/boostrap/node.js'
  }

  const file = await compiler.readFileAsync(bootFile),
    matches = file.contents.match(/\(function.*/),
    functionHeader = matches && matches[0]

  console.log('header', functionHeader)

  if (!functionHeader) {
    throw new Error('Failed to find bootstrap header in node version: v' + version)
  }

  file.contents = file.contents.replace(
    functionHeader,
    functionHeader + '\n' + '{{replace:lib/patches/bootstrap.js}}'
  )

  await compiler.setFileContentsAsync(
    'lib/_third_party_main.js',
    '{{replace:lib/patches/boot-nexe.js}}'
  )
  return next()
}
