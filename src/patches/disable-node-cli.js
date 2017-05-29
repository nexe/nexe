export default async function disableNodeCli (compiler, next) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  const nodeccMarker = "argv[index][0] == '-'"

  await compiler.replaceInFileAsync(
    'src/node.cc',
    nodeccMarker,
    nodeccMarker.replace('-', ']')
  )
  return next()
}
