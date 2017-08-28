import { NexeCompiler } from '../compiler'
import { FuseBox, JSONPlugin, CSSPlugin, HTMLPlugin, QuantumPlugin } from 'fuse-box'
//import NativeModulePlugin from './fuse-native-module-plugin'

function bundleProducer(filename: string, options: { name: string; minify: any }) {
  const plugins: any = [JSONPlugin(), CSSPlugin(), HTMLPlugin()]
  if (options.minify) {
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
    log: Boolean(process.env.NEXE_BUNDLE_DEBUG) || false,
    homeDir: process.cwd(),
    sourceMaps: false,
    writeBundles: false,
    output: '$name.js',
    target: 'server',
    plugins
  })
  fuse.bundle(options.name).instructions(`> ${filename}`)
  return fuse.run().then(x => {
    let output = ''
    x.bundles.forEach(y => (output = y.context.output.lastPrimaryOutput.content!.toString()))
    return output
  })
}

export default async function bundle(compiler: NexeCompiler, next: any) {
  if (!compiler.options.bundle) {
    return next()
  }

  let producer = bundleProducer
  if (typeof compiler.options.bundle === 'string') {
    producer = require(compiler.options.bundle).bundleProducer
  }

  compiler.input = await producer(compiler.options.input, {
    name: compiler.options.name,
    minify: compiler.options.compress
  })
  return next()
}
