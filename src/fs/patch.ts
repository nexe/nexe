import { getLibzipSync } from '@yarnpkg/libzip'
import { patchFs, npath, PosixFS, NodeFS, ZipFS } from '@yarnpkg/fslib'
import { SnapshotZipFS } from './SnapshotZipFS'
import * as assert from 'assert'
import * as constants from 'constants'

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

  const zipFs = new ZipFS(blob, {
    libzip: getLibzipSync(),
    readOnly: true,
  })
  const snapshotZipFS = new SnapshotZipFS({
    libzip: getLibzipSync(),
    zipFs,
    baseFs: nodeFs,
  })
  const posixSnapshotZipFs = new PosixFS(snapshotZipFS)
  patchFs(fs, posixSnapshotZipFs)
  const { readFileSync } = fs

  let log = (_: string) => true
  let loggedManifest = false
  if ((process.env.DEBUG || '').toLowerCase().includes('nexe:require')) {
    log = (text: string) => {
      if (!loggedManifest) {
        // TODO anything meaningful to log here?
        loggedManifest = true
      }
      return process.stderr.write('[nexe] - ' + text + '\n')
    }
  }
  patches.internalModuleReadFile = function (this: any, original: any, ...args: any[]) {
    log(`internalModuleReadFile ${args[0]}`)
    try {
      return fs.readFileSync(args[0], 'utf-8')
    } catch (e) {
      return null
    }
  }
  let returningArray: boolean
  patches.internalModuleReadJSON = function (this: any, original: any, ...args: any[]) {
    if (returningArray == null) returningArray = Array.isArray(original.call(this, ''))
    const res = patches.internalModuleReadFile.call(this, original, ...args)
    return returningArray && !Array.isArray(res)
      ? [res, /"(main|name|type|exports|imports)"/.test(res)]
      : res
  }
  patches.internalModuleStat = function (this: any, original: any, ...args: any[]) {
    log(`internalModuleStat ${args[0]}`)
    try {
      const stat = fs.statSync(args[0])
      if (stat.isDirectory()) return 1
      return 0
    } catch (e) {
      return -constants.ENOENT
    }
  }
  // TODO restore patches in restoreFs

  lazyRestoreFs = () => {
    Object.assign(fs, originalFsMethods)
    lazyRestoreFs = () => {}
  }
}

function restoreFs() {
  lazyRestoreFs()
}

export { shimFs, restoreFs }
