var nexe = require('nexe');

nexe.compile(
  {
    input: "./index.js",
    output: "",
    nodeVersion: "0.10.33",
    nodeTempDir: "",
    python: "C:\\Python27\\python.exe",
    flags: true,
    resourceFiles: ["./message.txt"]
  },
  function (err) {
    if (err) {
      console.log(err);
    }
  }
);
