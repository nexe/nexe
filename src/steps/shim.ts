import { NexeCompiler } from '../compiler'

function wrap(code: string) {
  return '!(function () {' + code + '})();'
}

export default function(compiler: NexeCompiler, next: () => Promise<void>) {
  compiler.shims.push(wrap(compiler.getHeader()))

  compiler.shims.push(
    wrap(`
    if (process.argv[1] && process.env.NODE_UNIQUE_ID) {
      const cluster = require('cluster')
      cluster._setupWorker()
      delete process.env.NODE_UNIQUE_ID
    }
  `)
  )

  if (compiler.options.resources.length) {
    compiler.shims.push(wrap('{{replace:lib/steps/shim-fs.js}}'))
  }

  //compiler.shims.push(wrap('{/{replace:lib/steps/shim-require.js}}'))

  if (compiler.options.fakeArgv) {
    const nty = !process.stdin.isTTY
    const input = nty ? '[stdin]' : compiler.options.input
    compiler.shims.push(
      wrap(`
      var r = require('path').resolve; 
      process.argv.splice(1,0, ${nty ? `'${input}'` : `r("${input}")`});`)
    )
  }

  return next()
}
