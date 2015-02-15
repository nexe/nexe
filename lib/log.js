module.exports = _log;

/**
 * logging aka stdout wrapper
 */

function _log () {

  var colors = require('colors');

  var args = Array.prototype.slice.call(arguments, 0),
  level = args.shift();

  if (!~["log", "error", "warn"].indexOf(level)) {
    args.unshift(level);
    level = "log";
  }

  if(level == "log") {
    args[0] = "----> " + args[0];
  } else if(level == "error") {
    args[0] = "....> " + colors.red("ERROR: ") + args[0]
  } else if(level == "warn") {
    args[0] = "....> " + colors.yellow("WARNING: ") + args[0]
  }

  console[level].apply(console, args);
}
