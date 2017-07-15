const { FuseBox } = require('fuse-box')
const nexe = '../..'
const { NativeModulePlugin } = require(nexe + '/lib/bundling/fuse')
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
    .target('electron')
    .instructions(`> index.js`)
fuse.run()
