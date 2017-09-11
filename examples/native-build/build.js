const nexe = require('../..')

nexe.compile({
  output: 'native-build',
  silent: true,
  native: {
    zmq: {
      additionalFiles: [
        '../../windows/lib/x64/libzmq-v100-mt-4_0_4.dll'
      ]
    }
  }
})

