import { join, dirname } from 'path'
import { readdir, unlink } from 'fs'
import { readFileAsync, writeFileAsync, isDirectoryAsync } from './util'
import Bluebird from 'bluebird'
import mkdirp from 'mkdirp'

const { promisify, map } = Bluebird
const mkdirpAsync = promisify(mkdirp)
const unlinkAsync = promisify(unlink)
const readdirAsync = promisify(readdir)

function readDirAsync (dir) {
  return readdirAsync(dir).map((file) => {
    const path = join(dir, file)
    return isDirectoryAsync(path).then(x => x ? readDirAsync(path) : path)
  }).reduce((a, b) => a.concat(b), [])
}

function maybeReadFileContentsAsync (file) {
  return readFileAsync(file, 'utf-8')
    .catch(e => {
      if (e.code === 'ENOENT') {
        return ''
      }
      throw e
    })
}

/**
 * The artifacts step is where source patches are committed, or written as "artifacts"
 * Steps:
 *  - A temporary directory is created in the downloaded source
 *  - On start, any files in that directory are restored into the source tree
 *  - After the patch functions have run, the temporary directory is emptied
 *  - Original versions of sources to be patched are written to the temporary directory
 *  - Finally, The patched files are written into source.
 *
 */
export default async function artifacts (compiler, next) {
  const { src } = compiler
  const temp = join(src, 'nexe')
  await mkdirpAsync(temp)
  const tmpFiles = await readDirAsync(temp)

  await map(tmpFiles, async (path) => {
    return compiler.writeFileAsync(path.replace(temp, ''), await readFileAsync(path))
  })

  await next()

  await map(tmpFiles, x => unlinkAsync(x))
  return map(compiler.files, async (file) => {
    const sourceFile = join(src, file.filename)
    const tempFile = join(temp, file.filename)
    const fileContents = await maybeReadFileContentsAsync(sourceFile)

    await mkdirpAsync(dirname(tempFile))
    await writeFileAsync(tempFile, fileContents)
    await compiler.writeFileAsync(file.filename, file.contents)
  })
}
