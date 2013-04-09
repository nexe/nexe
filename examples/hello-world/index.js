var http = require("http"),
fs = require("fs"),
path = require("path"),
port = 1337;

console.log("started HTTP server on port %d", port = Number(process.argv.concat().pop()) || port);

http.createServer(function(req, res) {
  fs.createReadStream(path.join(process.cwd(), "message.txt")).pipe(res);
}).listen(port);