const { expect } = require('chai')
const fs = require('fs')
const { dirname, basename }= require('path')

const files = { zipFs: 'test/integration/tests.integration-spec.js', real: 'real', real2: 'real2' }
describe('SnapshotZipFS', () => {
  console.error('Note: these tests are order dependant, so subsequent failures are likely a flow on effect.')
  it('checks existance from the zipFs', () => expect(fs.existsSync(files.zipFs)).to.equal(true))
  it('checks non-existance from the zipFs', () => expect(fs.existsSync('not found')).to.equal(false))
  it('reads from the zipFs', () => expect(fs.readFileSync(files.zipFs, 'utf8')).to.include('SnapshotZipFS'))
  it('copies from the zipFs', () => expect(() => fs.copyFileSync(files.zipFs, files.real)).not.to.throw())
  it('reads from the real fs', () => expect(fs.readFileSync(files.real, 'utf8')).to.include('SnapshotZipFS'))
  it('checks non-existance from the real fs', () => expect(fs.existsSync(files.real2)).to.equal(false))
  it('copies from the real fs', () => expect(() => fs.copyFileSync(files.real, files.real2)).not.to.throw())
  it('checks existance from the real fs', () => expect(fs.existsSync(files.real2)).to.equal(true))
  it('unlinks from the real fs', () => expect(() => fs.unlinkSync(files.real2)).not.to.throw())
  it('symlinks the real fs', () => expect(() => fs.symlinkSync('tmp', files.real2)).not.to.throw())
  it('readlinks the real fs', () => expect(fs.readlinkSync(files.real2)).to.equal('tmp'))
  it('truncates the real fs', () => expect(() => fs.truncateSync(files.real)).not.to.throw())
  it('writeFiles the real fs', () => expect(() => fs.writeFileSync(files.real2, 'testing')).not.to.throw())
  it('accesses the real fs', () => expect(() => fs.accessSync(files.real)).not.to.throw())
  it('accesses the zipFs', () => expect(() => fs.accessSync(files.zipFs)).not.to.throw())
  it('stats the real fs', () => expect(fs.statSync(files.real2).size).to.be.greaterThan(0))
  it('stats the zipFs', () => expect(fs.statSync(files.zipFs).size).to.be.greaterThan(0))
  it('readdirs from the zipFs', () => expect(fs.readdirSync(dirname(files.zipFs))).to.include(basename(files.zipFs)))
  it('readdirs from the real fs', () => expect(fs.readdirSync('.')).to.include(files.real))
  it('readdirs from both', () => {
    expect(fs.readdirSync('.')).to.include(files.real),
    expect(fs.readdirSync('.')).to.include('test')
  })
  let dir
  it('opendirs the zipFs fs', async () => {
    expect(() => dir = fs.opendirSync(dirname(files.zipFs))).not.to.throw()
    const names = []
    for await (const dirent of dir) {
      names.push(dirent.name)
    }
    expect(names).to.include(basename(files.zipFs))
  })
  it('opendirs the real fs and zipFs', async () => {
    expect(() => dir = fs.opendirSync('.')).not.to.throw()
    const names = []
    for await (const dirent of dir) {
      names.push(dirent.name)
    }
    expect(names).to.include(files.real)
    expect(names).to.include('test')
  })
  it('createWriteStreams to the real fs', () => expect(() => fs.createWriteStream('createWriteStream')).not.to.throw())
  it('createReadStreams to the real fs', () => expect(() => fs.createReadStream(files.real)).not.to.throw())
  it('createReadStreams to the zipFs', () => expect(() => fs.createReadStream(files.zipFs)).not.to.throw())
  it('renames to the realFs', () => {
    expect(() => fs.renameSync(files.real2, 'rename')).not.to.throw()
    expect(fs.existsSync('rename')).to.equal(true)
  })

  describe('write actions to the zipFs', () => {
    it(`won't truncate to the zipFs`, () => expect(() => fs.truncateSync(files.zipFs)).to.throw())
    it(`won't unlink from the zipFs`, () => expect(() => fs.unlinkSync(files.zipFs)).to.throw())
    it(`won't appendFile to the zipFs`, () => expect(() => fs.appendFileSync(files.zipFs, 'xxx')).to.throw())
    it(`won't symlink to the zipFs`, () => expect(() => fs.symlinkSync('tmp', files.zipFs)).to.throw())
    it(`won't chmod to the zipFs`, () => expect(() => fs.chmodSync(files.zipFs, 0o666)).to.throw())
    it(`won't chown to the zipFs`, () => expect(() => fs.chownSync(files.zipFs, 0, 0)).to.throw())
    it(`won't writeFile the zipFs`, () => expect(() => fs.writeFileSync(files.zipFs, 'testing')).to.throw())
    it(`won't createWriteStreams to the zipFs`, () => expect(() => fs.createWriteStream(files.zipFs)).to.throw())
    it(`won't rename to the zipFs`, () => expect(() => fs.renameSync(files.real, files.zipFs)).to.throw())
  })

  ;[ 'zipFs', 'real' ].forEach((k) => {
    it(`watches the ${k} fs`, () => expect(() => fs.watch(files[k], () => null).close()).not.to.throw())
    it(`watchFiles the ${k} fs`, () => expect(() => fs.watchFile(files[k], () => null)).not.to.throw())
    it(`unwatchFiles the ${k} fs`, () => expect(() => fs.unwatchFile(files[k])).not.to.throw())
  })
  let buffer = Buffer.alloc(8092), fd
  describe('zipfs file descriptors', () => {
    it('opens files in the zipFs', () => {
      expect(() => (fd = fs.openSync(files.zipFs, 'a+'))).not.to.throw()
      expect(fd).to.not.be.null
    })
    it('reads file descriptors from the zipFs', () => {
      expect(() => fs.readSync(fd, buffer)).not.to.throw()
      expect(buffer.toString()).to.include('SnapshotZipFS')
    })
    it('fstats the zipFs', () => expect(fs.fstatSync(fd).size).to.be.greaterThan(0))
    it(`won't write to the zipFs`, () => expect(() => fs.writeSync(fd, 'xxx')).to.throw())
    it(`won't fchmod the zipFs`, () => expect(() => fs.fchmodSync(fd)).to.throw())
    it(`won't fchown the zipFs`, () => expect(() => fs.fchownSync(fd)).to.throw())
    it(`won't ftruncate the zipFs`, () => expect(() => fs.ftruncateSync(fd)).to.throw())
    it('closes file descriptors from the zipFs', () => expect(() => fs.closeSync(fd)).not.to.throw())
  })

  fd = null
  buffer = Buffer.alloc(8092)
  describe('real file descriptors', () => {
    it('opens files in the real fs', () => {
      expect(() => (fd = fs.openSync(files.real2, 'a+'))).not.to.throw()
      expect(fd).to.not.be.null
    })
    it('reads file descriptors from the real', () => {
      expect(() => fs.readSync(fd, buffer)).not.to.throw()
      expect(buffer.toString()).to.include('SnapshotZipFS')
    })
    it('will write to the real fs', () => expect(() => fs.writeSync(fd, 'xxx')).not.to.throw())
    it('fstats the real fs', () => expect(fs.fstatSync(fd).size).to.be.greaterThan(0))
    it('closes file descriptors from the real fs', () => expect(() => fs.closeSync(fd)).not.to.throw())
  })

  describe('path clashes', () => {
    it('delegates directory creation to the real fs', () => expect(() => fs.mkdirSync('test')).not.to.throw())
    it('delegates directory removal to the real fs', () => expect(() => fs.rmdirSync('test')).not.to.throw())
  })
})
