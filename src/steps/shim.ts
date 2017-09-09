import { NexeCompiler } from '../compiler'

export default function(compiler: NexeCompiler, next: () => Promise<void>) {
  if (!compiler.options.fakeArgv) {
    return next()
  }

  const nty = !process.stdin.isTTY
  const input = nty ? '[stdin]' : compiler.options.input

  compiler.input =
    `!(() => {
    var r = require('path').resolve;
    process.argv.splice(1,0, ${nty ? `'${input}'` : `r("${input}")`});
  })();` + compiler.input

  return next()
}
