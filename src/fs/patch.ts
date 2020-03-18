import { getLibzipSync } from '@yarnpkg/libzip'
import { patchFs, npath, PosixFS, NodeFS, ZipFS } from '@yarnpkg/fslib'
import * as Path from 'path'
import { SnapshotZipFS } from './SnapshotZipFS'
import * as assert from 'assert'

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
    libzip: getLibzipSync()
  })
  const snapshotZipFS = new SnapshotZipFS({
    libzip: getLibzipSync(),
    mountAt: npath.toPortablePath('/snapshot'),
    zipFs,
    baseFs: nodeFs,
    readOnlyArchives: true
  })
  const posixSnapshotZipFs = new PosixFS(snapshotZipFS)
  patchFs(fs, posixSnapshotZipFs)

  lazyRestoreFs = () => {
    Object.assign(fs, originalFsMethods)
    lazyRestoreFs = () => {}
  }
}

function restoreFs() {
  lazyRestoreFs()
}

export { shimFs, restoreFs }
