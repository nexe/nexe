module.exports.nodeGyp = function * nodeGyp ({ files, readFileAsync, download }, next) {
  yield next()

  const nodegyp = yield readFileAsync('node.gyp'),
    nodeGypMarker = "'lib/fs.js',"

  nodegyp.contents = nodegyp.contents
    .replace(nodeGypMarker, `
      ${nodeGypMarker}
      ${files
          .filter(x => x.filename.startsWith('lib'))
          .map(x => `'${x.filename}'`)
          .toString()},
    `.trim())
}
