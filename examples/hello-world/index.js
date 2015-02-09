var http = require("http"),
fs = require("fs"),
path = require("path"),
nexeres = require("nexeres"),
childProc = require("child_process"),
port = 1337;

//Fork a new process to execute the broser.js
childProc.fork(path.join(__dirname, "browser.js"));
if (false) {
  require("./browser.js"); //force the bundler to include the .js file
}

//start a web server on specified port (or default if not given)
console.log("started HTTP server on port %d", port = Number(process.argv.concat().pop()) || port);

http.createServer(function(req, res) {
  //return the embeded file in response to any request
  
res.write(nexeres.get("message.txt"));

  res.end();
}).listen(port);
