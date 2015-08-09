var nexe = require('../..');

nexe.compile(
  {
    input: "./index.js",
    output: "./out.nex",
    nodeVersion: "3.0.0",
    framework: "iojs",
    nodeTempDir: "src",
    python: "python",
    flags: true,
    resourceFiles: ["./message.txt"]
  },
  function (err) {
    if (err) {
      console.log(err);
    }
  }
);
