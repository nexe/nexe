import { ZipFS, getLibzipSync } from '@yarnpkg/libzip'
import { patchFs, npath, PosixFS, NodeFS } from '@yarnpkg/fslib'
import { SnapshotZipFS } from './SnapshotZipFS'
import * as assert from 'assert'
import * as constants from 'constants'
import { dirname } from 'path'

export interface NexeHeader {
  blobPath: string
  layout: {
    resourceStart: number
    resourceSize: number
    contentSize: number
    contentStart: number
  }
}

let originalFsMethods: any = null
let lazyRestoreFs = () => {}
const patches = (process as any).nexe.patches || {}
const originalPatches = { ...patches }
delete (process as any).nexe

function shimFs(binary: NexeHeader, fs: typeof import('fs') = require('fs')) {
  if (originalFsMethods !== null) {
    return
  }

  originalFsMethods = Object.assign({}, fs)

  const realFs: typeof fs = { ...fs }
  const nodeFs = new NodeFS(realFs)

  const blob = Buffer.allocUnsafe(binary.layout.resourceSize)
  const blobFd = realFs.openSync(binary.blobPath, 'r')
  const bytesRead = realFs.readSync(
    blobFd,
    blob,
    0,
    binary.layout.resourceSize,
    binary.layout.resourceStart
  )
  assert.equal(bytesRead, binary.layout.resourceSize)

  const zipFs = new ZipFS(blob, { readOnly: true })
  const snapshotZipFS = new SnapshotZipFS({
    libzip: getLibzipSync(),
    zipFs,
    baseFs: nodeFs,
    root: dirname(process.argv[0]),
  })
  const posixSnapshotZipFs = new PosixFS(snapshotZipFS)
  patchFs(fs, posixSnapshotZipFs)

  let log = (_: string) => true
  if ((process.env.DEBUG || '').toLowerCase().includes('nexe:require')) {
    process.stderr.write(
      // @ts-ignore
      `[nexe] - FILES ${JSON.stringify(Array.from(zipFs.entries.keys()), null, 4)}\n`
    )
    process.stderr.write(
      // @ts-ignore
      `[nexe] - DIRECTORIES ${JSON.stringify(Array.from(zipFs.listings.keys()), null, 4)}\n`
    )
    log = (text: string) => {
      return process.stderr.write(`[nexe] - ${text}\n`)
    }
  }
  function internalModuleReadFile(this: any, original: any, ...args: any[]) {
    log(`internalModuleReadFile ${args[0]}`)
    try {
      return posixSnapshotZipFs.readFileSync(args[0], 'utf-8')
    } catch (e) {
      return ''
    }
  }
  if (patches.internalModuleReadFile) {
    patches.internalModuleReadFile = internalModuleReadFile
  }
  let returningArray: boolean
  patches.internalModuleReadJSON = function (this: any, original: any, ...args: any[]) {
    if (returningArray == null) returningArray = Array.isArray(original.call(this, ''))
    const res = internalModuleReadFile.call(this, original, ...args)
    return returningArray && !Array.isArray(res)
      ? res === ''
        ? []
        : [res, /"(main|name|type|exports|imports)"/.test(res)]
      : res
  }
  patches.internalModuleStat = function (this: any, original: any, ...args: any[]) {
    let statPath = args[0]
    //in node 22, the path arg moved to arg[1]
    if (typeof args[0] !== 'string') statPath = args[1]
    let result = 0
    try {
      const stat = posixSnapshotZipFs.statSync(statPath)
      if (stat.isDirectory()) result = 1
      else result = 0
    } catch (e) {
      result = -constants.ENOENT
    }
    log(`internalModuleStat ${result} ${statPath}`)
    return result
  }

  lazyRestoreFs = () => {
    Object.assign(fs, originalFsMethods)
    Object.assign(patches, originalPatches)
    lazyRestoreFs = () => {}
  }
}

function restoreFs() {
  lazyRestoreFs()
}

export { shimFs, restoreFs }
