const { FuseBox } = require('fuse-box')
const { NativeModulePlugin } = require('../../lib/bundling')
const fuse = FuseBox.init({
  homeDir: './',
  cache: false,
  log: true,
  debug: true,
  output: '$name.js',
  plugins: [
    new NativeModulePlugin({
      zmq: {
        additionalFiles: [
          '../../windows/lib/x64/libzmq-v100-mt-4_0_4.dll'
        ]
      }
    })
  ]
})
fuse.bundle('app')
    .target('server')
    .instructions(`> index.js`)
fuse.run()
