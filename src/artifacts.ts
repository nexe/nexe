import { join, dirname } from 'path'
import { readdir, unlink } from 'fs'
import { readFileAsync, writeFileAsync, isDirectoryAsync } from './util'
import { promisify, map } from 'bluebird'
import * as mkdirp from 'mkdirp'
import { NexeCompiler } from './compiler'

const mkdirpAsync = promisify(mkdirp)
const unlinkAsync = (promisify(unlink) as any) as (path: string) => PromiseLike<void>
const readdirAsync = promisify(readdir)

function readDirAsync(dir: string): PromiseLike<string[]> {
  return readdirAsync(dir)
    .map((file: string) => {
      const path = join(dir, file)
      return isDirectoryAsync(path).then((x: boolean) => (x ? readDirAsync(path) : path as any))
    })
    .reduce((a: string[], b: string[] | string) => a.concat(b), [])
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
 *
 */
export default async function artifacts(compiler: NexeCompiler, next: () => Promise<void>) {
  const { src } = compiler
  const temp = join(src, 'nexe')
  await mkdirpAsync(temp)
  const tmpFiles = await readDirAsync(temp)

  await map(tmpFiles, async path => {
    return compiler.writeFileAsync(path.replace(temp, ''), await readFileAsync(path, 'utf-8'))
  })

  await next()

  await map(tmpFiles, x => unlinkAsync(x))
  return map(compiler.files, async file => {
    const sourceFile = join(src, file.filename)
    const tempFile = join(temp, file.filename)
    const fileContents = await maybeReadFileContentsAsync(sourceFile)

    await mkdirpAsync(dirname(tempFile))
    await writeFileAsync(tempFile, fileContents)
    await compiler.writeFileAsync(file.filename, file.contents)
  })
}
