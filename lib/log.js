module.exports = _log;

/**
 */

function _log () {

  var args = Array.prototype.slice.call(arguments, 0),
  level = args.shift();

  if (!~["log", "error", "warn"].indexOf(level)) {
    args.unshift(level);
    level = "log";
  }

  args[0] = "----> " + args[0];

  console[level].apply(console, args);
}