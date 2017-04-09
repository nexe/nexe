function * disableNodeCli (compiler, next) {
  if (compiler.options.enableNodeCli) {
    return next()
  }

  const nodecc = yield compiler.readFileAsync('src/node.cc'),
    nodeccMarker = "argv[index][0] == '-'"

  nodecc.contents = nodecc.contents.replace(
    nodeccMarker,
    nodeccMarker.replace('-', ']')
  )

  return next()
}

module.exports.disableNodeCli = disableNodeCli
