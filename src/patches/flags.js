export default async function flags (compiler, next) {
  const nodeflags = compiler.options.flags
  if (!nodeflags.length) {
    return next()
  }

  await compiler.replaceInFileAsync(
    'node.gyp',
    "'node_v8_options%': ''",
    `'node_v8_options%': '${nodeflags.join(' ')}'`
  )

  return next()
}
