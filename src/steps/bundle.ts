import { NexeCompiler } from '../compiler'
import { FuseBox, JSONPlugin, CSSPlugin, HTMLPlugin, QuantumPlugin } from 'fuse-box'
import { readFileAsync, writeFileAsync } from '../util'
import { resolve } from 'path'
import NativeModulePlugin from '../bundling/fuse-native-module-plugin'
import { NexeOptions } from '../options'

function createBundle(options: NexeOptions) {
  const plugins: any = [JSONPlugin(), CSSPlugin(), HTMLPlugin(), NativeModulePlugin(options.native)]
  if (options.compress) {
    plugins.push(
      QuantumPlugin({
        target: 'server',
        uglify: true,
        bakeApiIntoBundle: options.name
      })
    )
  }
  const fuse = FuseBox.init({
    cache: false,
    log: Boolean(process.env.NEXE_BUNDLE_LOG) || false,
    homeDir: options.cwd,
    sourceMaps: false,
    writeBundles: false,
    output: '$name.js',
    target: 'server',
    plugins
  })
  fuse.bundle(options.name).instructions(`> ${options.input}`)
  return fuse.run().then(x => {
    let output = ''
    x.bundles.forEach(y => (output = y.context.output.lastPrimaryOutput.content!.toString()))
    return output
  })
}

export default async function bundle(compiler: NexeCompiler, next: any) {
  if (!compiler.options.bundle) {
    compiler.input = await readFileAsync(compiler.options.input, 'utf-8')
    return next()
  }

  if (compiler.options.empty || !compiler.options.input) {
    compiler.input = ''
    return next()
  }

  let producer = createBundle
  if (typeof compiler.options.bundle === 'string') {
    producer = require(resolve(compiler.options.cwd, compiler.options.bundle)).createBundle
  }

  compiler.input = await producer(compiler.options)

  if ('string' === typeof compiler.options.debugBundle) {
    await writeFileAsync(compiler.options.debugBundle, compiler.input)
  }

  return next()
}
