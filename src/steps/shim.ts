import { NexeCompiler } from '../compiler'
import { relative } from 'path'
import { wrap } from '../util'

export default function(compiler: NexeCompiler, next: () => Promise<void>) {
  compiler.shims.push(
    wrap(`process.__nexe=${JSON.stringify({ resources: compiler.resources.index })};`)
  )
  compiler.shims.push(wrap('{{replace:lib/steps/shim-fs.js}}'))
  compiler.shims.push(
    wrap(`
    if (process.argv[1] && process.env.NODE_UNIQUE_ID) {
      const cluster = require('cluster')
      cluster._setupWorker()
      delete process.env.NODE_UNIQUE_ID
    }
  `)
  )

  if (compiler.options.fakeArgv !== false) {
    const nty = !process.stdin.isTTY
    const input = nty
      ? '[stdin]'
      : JSON.stringify(relative(compiler.options.cwd, compiler.options.input))

    compiler.shims.push(
      wrap(`
        var r = require('path').resolve; 
        process.argv.splice(1,0, ${nty ? `'${input}'` : `r(${input})`});`)
    )
  }

  return next()
}
