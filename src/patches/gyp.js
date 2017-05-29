export default async function nodeGyp ({ files, replaceInFileAsync }, next) {
  await next()

  const nodeGypMarker = "'lib/fs.js',"
  await replaceInFileAsync('node.gyp', nodeGypMarker, `
    ${nodeGypMarker}
    ${files
        .filter(x => x.filename.startsWith('lib'))
        .map(x => `'${x.filename}'`)
        .toString()},
  `.trim())
}
