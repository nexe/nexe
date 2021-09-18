import * as fs from 'fs'
import { promisify } from 'util'
import { relative } from 'path'
import { Readable } from 'stream'
import { argv } from '../options'
import { File } from 'resolve-dependencies'
import MultiStream = require('multistream')
const archiver: any = require('archiver')
const highland: any = require('highland')

function makeRelativeToZip(cwd: string, path: string) {
  return '/snapshot/' + relative(cwd, path)
}

export function toStream(content: Buffer | string) {
  return highland([content])
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

  public addResource(absoluteFileName: string, content?: File | Buffer | string | null) {
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
    return await new Promise((resolve) =>
      highland(this.zip).toArray((arr: Array<Buffer>) => resolve(Buffer.concat(arr)))
    )
  }
}
