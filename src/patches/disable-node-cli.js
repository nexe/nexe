export default async function disableNodeCli (compiler, next) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  const nodecc = await compiler.readFileAsync('src/node.cc')
  const nodeccMarker = "argv[index][0] == '-'"

  nodecc.contents = nodecc.contents.replace(
    nodeccMarker,
    nodeccMarker.replace('-', ']')
  )

  return next()
}
