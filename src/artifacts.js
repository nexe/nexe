import { join, dirname } from 'path'
import { readdir, stat, readFile, unlink, writeFile } from 'fs'
import { promisify, map } from 'bluebird'
import mkdirp from 'mkdirp'

const mkdirpAsync = promisify(mkdirp)
const statAsync = promisify(stat)
const unlinkAsync = promisify(unlink)
const readdirAsync = promisify(readdir)
const writeAnyFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

function readDirAsync (dir) {
  return readdirAsync(dir).map((file) => {
    const path = join(dir, file)
    return statAsync(path).then(s => s.isDirectory() ? readDirAsync(path) : path)
  }).reduce((a, b) => a.concat(b), [])
}

function maybeReadFileContents (file) {
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
export async function artifacts ({ files, writeFileAsync, src }, next) {
  const temp = join(src, 'nexe')
  await mkdirpAsync(temp)
  const tmpFiles = await readDirAsync(temp)

  await map(tmpFiles, async (path) => {
    return writeFileAsync(path.replace(temp, ''), await readFileAsync(path))
  })

  await next()

  await map(tmpFiles, x => unlinkAsync(x))
  return map(files, async (file) => {
    const sourceFile = join(src, file.filename)
    const tempFile = join(temp, file.filename)
    const fileContents = await maybeReadFileContents(sourceFile)

    await mkdirpAsync(dirname(tempFile))
    await writeAnyFileAsync(tempFile, fileContents)
    await writeFileAsync(file.filename, file.contents)
  })
}
