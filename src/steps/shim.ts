import { NexeCompiler } from '../compiler'
import { wrap } from '../util'

export default function(compiler: NexeCompiler, next: () => Promise<void>) {
  compiler.shims.push(
    wrap(
      `process.__nexe = ${JSON.stringify(compiler.binaryConfiguration)};\n` +
        '{{replace:lib/fs/patch.js}}' +
        '\nshimFs(process.__nexe)'
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
        process.argv.splice(1,0, require.resolve("${compiler.entrypoint}"))  
      }
    `)
  )

  return next()
}
