var nexe = require('nexe');

nexe.compile(
  {
    input: "./index.js",
    output: "./hellowWorld.exe",
    nodeVersion: "0.10.33",
    nodeTempDir: "",
    flags: true,
    resourceFiles: ["./message.txt"]
  },
  function (err) {
    if (err) {
      console.log(err);
    }
  }
);
