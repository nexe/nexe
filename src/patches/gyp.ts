import { NexeCompiler } from '../compiler'

export default async function nodeGyp(
  { files, replaceInFileAsync }: NexeCompiler,
  next: () => Promise<void>
) {
  await next()

  const nodeGypMarker = "'lib/fs.js',"
  await replaceInFileAsync(
    'node.gyp',
    nodeGypMarker,
    `
    ${nodeGypMarker}
    ${files
      .filter((x) => x.filename.startsWith('lib'))
      .map((x) => `'${x.filename}'`)
      .toString()},
  `.trim()
  )
}
