export default async function flags (compiler, next) {
  const nodeflags = compiler.options.flags
  if (!nodeflags.length) {
    return next()
  }

  const nodegyp = await compiler.readFileAsync('node.gyp')

  nodegyp.contents = nodegyp.contents.replace(
    "'node_v8_options%': ''",
    `'node_v8_options%': '${nodeflags.join(' ')}'`)

  return next()
}
