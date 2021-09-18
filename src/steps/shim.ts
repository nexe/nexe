import { NexeCompiler } from '../compiler'
import { wrap } from '../util'

export default async function (compiler: NexeCompiler, next: () => Promise<void>) {
  await next()
  compiler.shims.push(
    wrap(
      [
        'process.__nexe = {};',
        'const fsPatcher = (function() {',
        'const module = {exports: {}};',
        'const exports = module.exports;',
        '{{file("lib/fs/patch.bundle.js")}}',
        'return module.exports;',
        '})()',
        'fsPatcher.shimFs(process.__nexe);',
        compiler.options.fs ? '' : 'restoreFs();',
      ].join('\n')
      //TODO support only restoring specific methods
    )
  )
  compiler.shims.push(
    wrap(`
    if (process.argv[1] && process.env.NODE_UNIQUE_ID) {
      const cluster = require('cluster')
      cluster._setupWorker()
      delete process.env.NODE_UNIQUE_ID
    }
  `)
  )

  compiler.shims.push(
    wrap(`
      if (!process.send) {
        const path = require('path')
        const entry = path.resolve(path.dirname(process.execPath),${JSON.stringify(
          compiler.entrypoint
        )})
        process.argv.splice(1,0, entry)
      }
    `)
  )
}
