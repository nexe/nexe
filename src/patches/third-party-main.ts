import { parse } from 'meriyah'
import { NexeCompiler, NexeError } from '../compiler'
import { wrap, semverGt } from '../util'

export default async function main(compiler: NexeCompiler, next: () => Promise<void>) {
  let bootFile = 'lib/internal/bootstrap/pre_execution.js'
  if (semverGt(compiler.target.version, '18.11.99')) {
    bootFile = 'lib/internal/process/pre_execution.js'
  }
  const file = await compiler.readFileAsync(bootFile),
    ast = parse(file.contents.toString(), {
      next: true,
      globalReturn: true,
      loc: true,
      specDeviation: true,
    }),
    location = { start: { line: 0 } }

  walkSome(ast, (node: any) => {
    if (!location.start.line && node.type === 'BlockStatement') {
      // Find the first block statement and mark the location
      Object.assign(location, node.loc)
      return true
    }
  })

  const fileLines = file.contents.toString().split('\n')

  fileLines.splice(
    location.start.line,
    0,
    '{{replace:lib/MOD/fs/bootstrap.js}}' + '\n' + 'expandArgv1 = false;\n'
  )
  file.contents = fileLines.join('\n')

  const boot = await compiler.replaceInFileAsync(
      bootFile,
      'initializeFrozenIntrinsics();',
      'initializeFrozenIntrinsics();\n' + wrap('{{replace:lib/MOD/patches/boot-nexe.js}}')
    ),
    userModuleAssertion = await compiler.replaceInFileAsync(
      bootFile,
      'assert(!CJSLoader.hasLoadedAnyUserCJSModule)',
      '/*assert(!CJSLoader.hasLoadedAnyUserCJSModule)*/'
    ),
    workerSupport = await compiler.replaceInFileAsync(
      'src/node.cc',
      'if (env->worker_context() != nullptr) {',
      'if (env->worker_context() == nullptr) {\n' +
        '  return StartExecution(env, "internal/main/run_main_module"); } else {\n'
    )

  assertPatches({ boot, userModuleAssertion, workerSupport })

  return await next()
}

function assertPatches(patches: Record<string, boolean>) {
  if (!Object.values(patches).every((x) => x)) {
    let message = ''
    Object.entries(patches).forEach(([k, v]) => {
      if (!v) message += `\nFailed to apply patch for: "${k}". Please open an issue.`
    })
    throw new NexeError(message.trim())
  }
}

function walkSome(node: any, visit: (node: any) => boolean | undefined) {
  if (!node || typeof node.type !== 'string' || node._visited) {
    return false
  }
  visit(node)
  node._visited = true
  for (const childNode in node) {
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
