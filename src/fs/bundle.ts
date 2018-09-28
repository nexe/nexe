import { stat as getStat, Stats, createReadStream } from 'fs'
import { relative } from 'path'
import { Readable } from 'stream'
import combineStreams = require('multistream')

const stat = (file: string): Promise<Stats> => {
  return new Promise((resolve, reject) => {
    getStat(file, (err, stats) => (err ? reject(err) : resolve(stats)))
  })
}

function makeRelative(cwd: string, path: string) {
  return './' + relative(cwd, path)
}

export function toStream(content: Buffer | string) {
  const readable = new Readable({ read() {} })
  readable.push(content)
  readable.push(null)
  return readable
}

export type File = { absPath: string; contents: string; deps: FileMap }
export type FileMap = { [absPath: string]: File | null }

export interface BundleOptions {
  entries: string[]
  cwd: string
  expand: boolean
  loadContent: boolean
  files: FileMap
}

export class Bundle {
  constructor({ cwd }: { cwd: string } = { cwd: process.cwd() }) {
    this.cwd = cwd
  }
  cwd: string
  blobSize: number = 0
  index: { [relativeFilePath: string]: [number, number] } = {}
  streams: (Readable | (() => Readable))[] = []

  async addResource(absoluteFileName: string, content?: Buffer | string) {
    let length = 0
    if (content !== undefined) {
      length = Buffer.byteLength(content)
    } else {
      const stats = await stat(absoluteFileName)
      length = stats.size
    }

    const start = this.blobSize

    this.blobSize += length
    this.index[makeRelative(this.cwd, absoluteFileName)] = [start, length]
    this.streams.push(() => (content ? toStream(content) : createReadStream(absoluteFileName)))
  }

  concat() {
    throw new Error('Not Implemented')
  }

  toStream() {
    return combineStreams(this.streams)
  }

  toJSON() {
    return this.index
  }
}
