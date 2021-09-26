import * as fs from 'fs'
import { promisify } from 'util'
import { relative } from 'path'
import { Readable } from 'stream'
import { argv } from '../options'
import { File } from 'resolve-dependencies'
import MultiStream = require('multistream')

const lstat = promisify(fs.lstat),
  realpath = promisify(fs.realpath),
  createReadStream = fs.createReadStream,
  stat = promisify(fs.stat)

export type MultiStreams = (Readable | (() => Readable))[]

function makeRelative(cwd: string, path: string) {
  return './' + relative(cwd, path)
}

function sortEntry(a: [string, File], b: [string, File]) {
  return a[0] > b[0] ? 1 : -1
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

async function createFile(absoluteFileName: string) {
  const stats = await lstat(absoluteFileName),
    file: File = {
      size: stats.size,
      moduleType: 'commonjs',
      contents: '',
      absPath: absoluteFileName,
      deps: {},
    }
  if (stats.isSymbolicLink()) {
    file.size = stats.size
    const [realPath, realStat] = await Promise.all([
      realpath(absoluteFileName),
      stat(absoluteFileName),
    ])
    file.realPath = realPath
    file.realSize = realStat.size
  }
  return file
}

export class Bundle {
  size = 0
  cwd: string
  rendered = false
  private offset = 0
  private index: { [key: string]: [number, number] } = {}
  private files: { [key: string]: File } = {}
  streams: MultiStreams = []
  constructor({ cwd }: { cwd: string } = { cwd: process.cwd() }) {
    this.cwd = cwd
  }

  get list() {
    return Object.keys(this.files)
  }

  public async addResource(
    absoluteFileName: string,
    content?: File | Buffer | string
  ): Promise<number> {
    if (this.files[absoluteFileName]) {
      return this.size
    }
    if (typeof content === 'string' || Buffer.isBuffer(content)) {
      this.files[absoluteFileName] = {
        size: Buffer.byteLength(content),
        moduleType: 'commonjs',
        contents: content as any, //todo type is wrong here... should allow buffer
        deps: {},
        absPath: absoluteFileName,
      }
    } else if (content) {
      this.files[content.absPath] = content
    } else {
      this.files[absoluteFileName] = {
        absPath: absoluteFileName,
        moduleType: 'commonjs',
        contents: '',
        deps: {},
        size: 0,
      }
      this.files[absoluteFileName] = await createFile(absoluteFileName)
    }
    return (this.size += this.files[absoluteFileName].size)
  }

  /**
   * De-dupe files by absolute path, partition by symlink/real
   * Iterate over real, add entries
   * Iterate over symlinks, add symlinks
   */
  renderIndex() {
    if (this.rendered) {
      throw new Error('Bundle index already rendered')
    }
    const files = Object.entries(this.files),
      realFiles: [string, File][] = [],
      symLinks: [string, File][] = []
    for (const entry of files) {
      if (entry[1].realPath) {
        symLinks.push(entry)
      } else {
        realFiles.push(entry)
      }
    }
    realFiles.sort(sortEntry)
    symLinks.sort(sortEntry)

    for (const [absPath, file] of realFiles) {
      this.addEntry(absPath, file)
    }
    for (const [absPath, file] of symLinks) {
      this.addEntry(file.realPath as string, file)
      this.addEntry(absPath, file, file.realPath)
    }
    this.rendered = true
    return this.index
  }

  /**
   * Add a stream if needed and an entry with the required offset and size
   * Ensure the calling order of this method is idempotent (eg, while iterating a sorted set)
   * @param entryPath
   * @param file
   * @param useEntry
   */
  addEntry(entryPath: string, file: File, useEntry?: string) {
    const existingName = useEntry && makeRelative(this.cwd, useEntry),
      name = makeRelative(this.cwd, entryPath),
      size = file.realSize ?? file.size,
      existingEntry = this.index[existingName ?? name]

    this.index[name] = existingEntry || [this.offset, size]
    if (!existingEntry) {
      this.streams.push(() =>
        file.contents ? toStream(file.contents) : createReadStream(file.absPath)
      )
      this.offset += size
    }
  }

  toStream() {
    return new (MultiStream as any)(this.streams)
  }
}
