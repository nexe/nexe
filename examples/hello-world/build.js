var nexe = require('../..');

nexe.compile(
  {
    input: "./index.js",
    output: "./out.nex",
    nodeVersion: "3.0.0",
    nodeTempDir: "./src",
    framework: "iojs",
    python: 'python',
    flags: true
  },
  function (err) {
    if (err) {
      console.log(err);
    }
  }
);
