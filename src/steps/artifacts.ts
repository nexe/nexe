import { join, dirname } from 'node:path'
import { unlink, readdir, mkdir } from 'node:fs/promises'

import { readFile, writeFile, isDirectory } from '../util.js'
import type { NexeCompiler } from '../compiler.js'

async function readDirAsync(dir: string): Promise<string[]> {
  return await readdir(dir).then(async (paths) => {
    return await Promise.all(
      paths.map(async (file: string) => {
        const path = join(dir, file)
        return await isDirectory(path).then((x) => (x ? readDirAsync(path) : (path as any)))
      })
    ).then((result) => result.flat())
  })
}

async function maybeReadFileContentsAsync(file: string) {
  return await readFile(file, 'utf-8').catch((e) => {
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
  const { src } = compiler,
    temp = join(src, 'nexe')
  await mkdir(temp, { recursive: true })
  const tmpFiles = await readDirAsync(temp)

  await Promise.all(
    tmpFiles.map(async (path) => {
      return await compiler.writeFileAsync(path.replace(temp, ''), await readFile(path, 'utf-8'))
    })
  )

  await next()

  await Promise.all(tmpFiles.map(async (x) => await unlink(x)))
  return await Promise.all(
    compiler.files.map(async (file) => {
      const sourceFile = join(src, file.filename),
        tempFile = join(temp, file.filename),
        fileContents = await maybeReadFileContentsAsync(sourceFile)

      await mkdir(dirname(tempFile), { recursive: true })
      await writeFile(tempFile, fileContents)
      await compiler.writeFileAsync(file.filename, file.contents)
    })
  )
}
