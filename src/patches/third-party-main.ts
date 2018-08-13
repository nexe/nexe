import { NexeCompiler } from '../compiler'
import { parse } from 'cherow'

function semverGt(version: string, operand: string) {
  const [cMajor, cMinor, cPatch] = version.split('.').map(Number)
  const [major, minor, patch] = operand.split('.').map(Number)

  return (
    cMajor > major ||
    (cMajor === major && cMinor > minor) ||
    (cMajor === major && cMinor === minor && cPatch > patch)
  )
}

function walkSome(node: any, visit: Function) {
  if (!node || typeof node.type !== 'string' || node._visited) {
    return false
  }
  visit(node)
  node._visited = true
  for (let childNode in node) {
    const child = node[childNode]
    if (Array.isArray(child)) {
      for (let i = 0; i < child.length; i++) {
        if (walkSome(child[i], visit)) {
          return true
        }
      }
    } else if (walkSome(child, visit)) {
      return true
    }
  }
  return false
}

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  let bootFile = 'lib/internal/bootstrap_node.js'
  const { version } = compiler.target

  if (version.startsWith('4.')) {
    bootFile = 'src/node.js'
  } else if (semverGt(version, '9.10.1')) {
    bootFile = 'lib/internal/bootstrap/node.js'
  }

  const file = await compiler.readFileAsync(bootFile),
    ast = parse(file.contents, {
      loc: true,
      tolerant: true,
      next: true,
      globalReturn: true,
      node: true,
      skipShebang: true
    }),
    location = { start: { line: 0 } }

  walkSome(ast, (node: any) => {
    if (!location.start.line && node.type === 'BlockStatement') {
      //Find the first block statement and mark the location
      Object.assign(location, node.loc)
      return true
    }
  })

  const fileLines = file.contents.split('\n')
  fileLines.splice(location.start.line, 0, '{{replace:lib/patches/bootstrap.js}}' + '\n')
  file.contents = fileLines.join('\n')

  await compiler.setFileContentsAsync(
    'lib/_third_party_main.js',
    '{{replace:lib/patches/boot-nexe.js}}'
  )
  return next()
}
