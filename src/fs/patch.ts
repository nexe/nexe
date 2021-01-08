import { getLibzipSync } from '@yarnpkg/libzip'
import { patchFs, npath, PosixFS, NodeFS, ZipFS } from '@yarnpkg/fslib'
import { SnapshotZipFS } from './SnapshotZipFS'
import * as assert from 'assert'
import { Stats } from 'fs'
import { getLatestGitRelease } from '../releases'

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
  })
  const snapshotZipFS = new SnapshotZipFS({
    libzip: getLibzipSync(),
    mountAt: npath.toPortablePath('/snapshot'),
    zipFs,
    baseFs: nodeFs,
    readOnlyArchives: true,
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
    return fs.readFileSync(args[0], 'utf-8')
  }
  patches.internalModuleReadJSON = patches.internalModuleReadFile
  patches.internalModuleStat = function (this: any, original: any, ...args: any[]) {
    console.dir(npath.contains('/snapshot', args[0]))
    if (npath.contains('/snapshot', args[0]) === '/') {
      return 1
    }
    if (npath.contains('/snapshot', args[0]) != null) {
      try {
        const stat = fs.statSync(args[0])
        if (stat.isDirectory()) return 1
        return 0
      } catch (e) {
        return -e.errno
      }
    } else {
      return original.apply(this, args)
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
