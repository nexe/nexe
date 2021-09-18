import { relative } from 'path'
import { Readable } from 'stream'
import { File } from 'resolve-dependencies'
import archiver from 'archiver'

function makeRelativeToZip(cwd: string, path: string) {
  return '/snapshot/' + relative(cwd, path)
}

export function toStream(content: Buffer | string) {
  const readable = new Readable({
    read() {
      this.push(content)
      this.push(null)
    },
  })
  return readable
}
export class Bundle {
  cwd: string
  files = new Set<string>()
  zip: any
  constructor({ cwd }: { cwd: string } = { cwd: process.cwd() }) {
    this.cwd = cwd
    this.zip = archiver('zip')
  }

  get list() {
    return Array.from(this.files)
  }

  public addResource(absoluteFileName: string, content?: File | Buffer | string) {
    const destPath = makeRelativeToZip(this.cwd, absoluteFileName)
    if (!this.files.has(destPath)) {
      if (content == null) {
        this.zip.file(absoluteFileName, { name: destPath })
      } else {
        this.zip.append(content, { name: destPath })
      }
      this.files.add(destPath)
    }
  }

  public finalize() {
    return this.zip.finalize()
  }

  public toStream(): Readable {
    return this.zip
  }
}
