var path = require("path"),
    fs = require("fs");

function embed(resourceFiles, resourceRoot, complete) {
  function encode(filePath) {
    return fs.readFileSync(filePath).toString('base64');
  }

  resourceFiles = resourceFiles || [];
  resourceRoot = resourceRoot || "";

  if (!Array.isArray(resourceFiles)) {
    throw new Error("Bad Argument: resourceFiles is not an array");
  }

  var buffer = "var embeddedFiles = {\n";
  for (var i = 0; i < resourceFiles.length; ++i) {
    buffer += JSON.stringify(path.relative(resourceRoot, resourceFiles[i])) + ': "';
    buffer += encode(resourceFiles[i]) + '",\n';
  }

  buffer += "\n};\n\nmodule.exports.keys = function () { return Object.keys(embeddedFiles); }\n\nmodule.exports.get = ";
  buffer += accessor.toString();
  complete(null, buffer);
}

var accessor = function (key) {
  if (embeddedFiles.hasOwnProperty(key)) {
    return new Buffer(embeddedFiles[key], 'base64');
  }
  else {
    //file was not embedded, throw err.
    throw new Error('Embedded file not found');
  }
}

module.exports = embed;
