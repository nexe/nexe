var nexe = require('nexe');

nexe.compile(
  {
    input: "./index.js",
    output: "./out.exe",
    nodeVersion: "latest",
    nodeTempDir: "",
    python: "C:\\Python27\\python.exe",
    flags: true
  },
  function (err) {
    if (err) {
      console.log(err);
    }
  }
);
