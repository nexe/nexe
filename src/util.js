function dequote (input) {
  input = input.trim()
  if (input.startsWith('\'') && input.endsWith('\'') ||
    input.startsWith('"') && input.endsWith('"')) {
    return input.slice(1).slice(0, -1)
  }
  return input
}

module.exports.dequote = dequote