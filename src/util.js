export function dequote (input) {
  input = input.trim()

  const singleQuote = input.startsWith('\'') && input.endsWith('\'')
  const doubleQuote = input.startsWith('"') && input.endsWith('"')
  if (singleQuote || doubleQuote) {
    return input.slice(1).slice(0, -1)
  }
  return input
}
