import { stat as getStat, Stats, readFileSync } from 'fs'
const fs = require('fs')
import { relative, resolve, dirname } from 'path'
import { Readable } from 'stream'
import { getLibzipSync } from '@yarnpkg/libzip'
import { ZipFS, npath, PosixFS, extendFs } from '@yarnpkg/fslib'

const stat = (file: string): Promise<Stats> => {
  return new Promise((resolve, reject) => {
    getStat(file, (err, stats) => (err ? reject(err) : resolve(stats)))
  })
}

function makeRelative(cwd: string, path: string) {
  return './' + relative(cwd, path)
}

export function toStream(content: Buffer | string) {
  const readable = new Readable({
    read() {
      this.push(content)
      this.push(null)
    }
  })
  return readable
}

export type File = { absPath: string; contents: string; deps: FileMap }
export type FileMap = { [absPath: string]: File | null }

export interface BundleOptions {
  cwd?: string
  tempZip: string
}

export class Bundle {
  constructor({ cwd = process.cwd(), tempZip }: BundleOptions) {
    this.cwd = cwd
    this.tempZip = tempZip
  }
  cwd: string
  /** Path to temp file where .zip will be written */
  tempZip: string
  files: Map<string, Buffer | undefined> = new Map()
  directories: Set<string> = new Set()

  async addResource(absoluteFileName: string, content?: Buffer | string) {
    this.files.set(makeRelative(this.cwd, absoluteFileName), undefined)
  }

  async addDirectoryResource(absoluteFileName: string) {
    this.directories.add(makeRelative(this.cwd, absoluteFileName))
  }

  concat() {
    throw new Error('Not Implemented')
  }

  writeZip() {
    const fakeZipFs = new ZipFS(npath.toPortablePath(resolve(this.tempZip)), {
      libzip: getLibzipSync(),
      create: true
    })
    const fakePosixZipFs = new PosixFS(fakeZipFs)
    const zipFs = extendFs(fs, fakePosixZipFs)

    for (const relPath of this.directories) {
      // TODO windows support
      const destPath = resolve('/', relPath)
      zipFs.mkdirpSync(destPath)
    }
    for (const [relPath, content] of this.files) {
      const srcPath = resolve(this.cwd, relPath)
      // TODO windows support
      const destPath = resolve('/', relPath)
      const destDirPath = dirname(destPath)
      const _content = content ?? readFileSync(srcPath)
      zipFs.mkdirpSync(destDirPath)
      zipFs.writeFileSync(destPath, _content)
    }

    fakeZipFs.saveAndClose()
  }
}
