export default async function nodeGyp ({ files, readFileAsync }, next) {
  await next()

  const nodegyp = await readFileAsync('node.gyp')
  const nodeGypMarker = "'lib/fs.js',"

  nodegyp.contents = nodegyp.contents
    .replace(nodeGypMarker, `
      ${nodeGypMarker}
      ${files
          .filter(x => x.filename.startsWith('lib'))
          .map(x => `'${x.filename}'`)
          .toString()},
    `.trim())
}
