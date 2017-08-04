import { NexeCompiler } from '../compiler'
import { FuseBox, JSONPlugin, CSSPlugin, HTMLPlugin } from 'fuse-box'
import NativeModulePlugin from './fuse'

function bundleProducer(filename: string) {
  const fuse = FuseBox.init({
    cache: false,
    log: Boolean(process.env.NEXE_BUNDLE_DEBUG) || false,
    homeDir: './',
    writeBundles: false,
    target: 'server',
    plugins: [JSONPlugin(), CSSPlugin(), HTMLPlugin()]
  })
  fuse.bundle('nexe').instructions(`> ${filename}`)
  return fuse.run().then(x => {
    if (x.bundles.size > 1) {
      console.log('THROW', x.bundles)
    }
    let output = ''
    x.bundles.forEach(y => (output = y.context.output.lastPrimaryOutput.content!.toString()))
  })
}

export default function bundle(compiler: NexeCompiler, next: any) {
  if (!compiler.options.bundle) {
    return next()
  }

  if (typeof compiler.options.bundle === 'string') {
  }
}
