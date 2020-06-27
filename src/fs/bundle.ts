import * as fs from 'fs'
import { promisify } from 'util'
import { relative } from 'path'
import { Readable } from 'stream'
import { each } from '@calebboyd/semaphore'
import MultiStream = require('multistream')

const { createReadStream } = fs,
  lstat = promisify(fs.lstat),
  realpath = promisify(fs.realpath),
  stat = promisify(fs.stat)

export type MultiStreams = (Readable | (() => Readable))[]

function renderSortedObject(entries: [string, [number, number]][], streams: MultiStreams) {
  return entries.sort().reduce((obj, [key, value]) => {
    streams.push((value as any).stream)
    ;(value as any).stream = void 0
    return Object.assign(obj, { [key]: value })
  }, {})
}

function makeRelative(cwd: string, path: string) {
  return './' + relative(cwd, path)
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
  size = 0
  cwd: string
  rendered = false
  files: { [key: string]: string | Buffer | undefined } = {}
  streams: MultiStreams = []
  private index: { [relativeFilePath: string]: [number, number] } = {}
  constructor({ cwd }: { cwd: string } = { cwd: process.cwd() }) {
    this.cwd = cwd
  }

  addResource(absoluteFileName: string, content?: Buffer | string) {
    this.files[absoluteFileName] = content
  }

  async addEntry(absoluteFileName: string, content?: Buffer | string) {
    let length = 0
    let linkpath = ''
    if (content !== undefined) {
      length = Buffer.byteLength(content)
    } else {
      let stats = await lstat(absoluteFileName)
      if (stats.isSymbolicLink()) {
        linkpath = absoluteFileName
        absoluteFileName = await realpath(linkpath)
        stats = await stat(linkpath)
      }
      length = stats.size
    }
    const name = makeRelative(this.cwd, absoluteFileName),
      existing = this.index[name]
    if (!existing) {
      const start = this.size
      this.size += length
      this.index[name] = [start, length]
    }
    if (linkpath) {
      const linkName = makeRelative(this.cwd, absoluteFileName)
      this.index[linkName] = this.index[name]
    }
    if (!existing) {
      ;(this.index[name] as any).stream = () =>
        content ? toStream(content) : createReadStream(absoluteFileName)
    }
  }

  fileIndex() {
    if (!this.rendered) {
      throw new Error('Index not rendered must call toStream() first')
    }
    return this.index
  }

  async toStream() {
    this.files
    await each(
      Object.keys(this.files),
      (key: string) => {
        return this.addEntry(key, this.files[key])
      },
      { concurrency: 10 }
    )
    this.index = renderSortedObject(Object.entries(this.index), this.streams)
    this.rendered = true
    return new (MultiStream as any)(this.streams)
  }
}
