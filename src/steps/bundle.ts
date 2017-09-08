import { NexeCompiler } from '../compiler'
import { FuseBox, JSONPlugin, CSSPlugin, HTMLPlugin, QuantumPlugin } from 'fuse-box'
import { readFileAsync, writeFileAsync } from '../util'
//import NativeModulePlugin from './fuse-native-module-plugin'

function createBundle(filename: string, options: { name: string; minify: any; cwd: string }) {
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
    homeDir: options.cwd,
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
    compiler.input = await readFileAsync(compiler.options.input, 'utf-8')
    return next()
  }

  if (compiler.options.empty || !compiler.options.input) {
    compiler.input = ''
    return next()
  }

  let producer = createBundle
  if (typeof compiler.options.bundle === 'string') {
    producer = require(compiler.options.bundle).createBundle
  }

  compiler.input = await producer(compiler.options.input, {
    cwd: compiler.options.cwd,
    name: compiler.options.name,
    minify: compiler.options.compress
  })

  if (compiler.options.debugBundle) {
    await writeFileAsync(compiler.options.debugBundle, compiler.input)
  }

  return next()
}
