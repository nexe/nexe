import * as fs from 'fs'
import { promisify } from 'util'
import { relative } from 'path'
import { Readable } from 'stream'
import { argv } from '../options'
import { File } from 'resolve-dependencies'
import MultiStream = require('multistream')
const archiver: any = require('archiver')

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

  public async toBuffer(): Promise<Buffer> {
    this.zip.finalize()
    const zipData: Buffer[] = []
    this.zip.on('data', (data: Buffer) => zipData.push(data))
    return await new Promise((resolve, reject) => {
      this.zip.on('error', (error: Error) => reject(error))
      this.zip.on('end', () => resolve(Buffer.concat(zipData)))
    })
  }
}
