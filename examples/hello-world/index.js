var http = require("http"),
fs = require("fs"),
path = require("path"),
port = 1337;

//Fork a new process to execute the broser.js
var childProc = require("child_process");
childProc.fork("./browser.js");
if (false) {
	require("./browser.js"); //force the bundler to include the .js file
}

//start a web server on specified port (or default if non given)
console.log("started HTTP server on port %d", port = Number(process.argv.concat().pop()) || port);

http.createServer(function(req, res) {
  fs.createReadStream(path.join(process.cwd(), "message.txt")).pipe(res);
}).listen(port);