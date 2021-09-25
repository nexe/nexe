const { mkdtemp } = require('fs/promises')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')

async function runTests() {
  const tempdir = await mkdtemp(path.join(os.tmpdir(), 'nexe-'))
  process.on('beforeExit', () => rimraf.sync(tempdir))
  process.chdir(tempdir)
  const Mocha = require('mocha')
  const mocha = new Mocha()
  mocha.addFile('test/integration/tests.integration-spec.js')
  mocha.run((failures) => {
    process.exitCode = failures ? 1 : 0
  })
}

runTests()
