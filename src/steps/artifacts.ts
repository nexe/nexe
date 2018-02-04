import { join, dirname } from 'path'
import { readdir, unlink } from 'fs'
import { readFileAsync, writeFileAsync, isDirectoryAsync } from '../util'
import * as mkdirp from 'mkdirp'
import { NexeCompiler } from '../compiler'
import pify = require('pify')

const mkdirpAsync = pify(mkdirp)
const unlinkAsync = pify(unlink)
const readdirAsync = pify(readdir)

function readDirAsync(dir: string): Promise<string[]> {
  return readdirAsync(dir).then(paths => {
    return Promise.all(
      paths.map((file: string) => {
        const path = join(dir, file)
        return isDirectoryAsync(path).then(x => (x ? readDirAsync(path) : (path as any)))
      })
    ).then(result => {
      return [].concat(...(result as any))
    })
  })
}

function maybeReadFileContentsAsync(file: string) {
  return readFileAsync(file, 'utf-8').catch(e => {
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
 */
export default async function artifacts(compiler: NexeCompiler, next: () => Promise<void>) {
  const { src } = compiler
  const temp = join(src, 'nexe')
  await mkdirpAsync(temp)
  const tmpFiles = await readDirAsync(temp)

  await Promise.all(
    tmpFiles.map(async path => {
      return compiler.writeFileAsync(path.replace(temp, ''), await readFileAsync(path, 'utf-8'))
    })
  )

  await next()

  await Promise.all(tmpFiles.map(x => unlinkAsync(x)))
  return Promise.all(
    compiler.files.map(async file => {
      const sourceFile = join(src, file.filename)
      const tempFile = join(temp, file.filename)
      const fileContents = await maybeReadFileContentsAsync(sourceFile)

      await mkdirpAsync(dirname(tempFile))
      await writeFileAsync(tempFile, fileContents)
      await compiler.writeFileAsync(file.filename, file.contents)
    })
  )
}
