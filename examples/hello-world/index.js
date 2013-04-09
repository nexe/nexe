var http = require("http"),
port = 1337;

console.log(process.argv);

console.log("started HTTP server on port %d", 1337);

http.createServer(function(req, res) {
  res.end("Hello World!!");
}).listen(port);