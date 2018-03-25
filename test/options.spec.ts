import { normalizeOptions } from '../src/options'
import { expect } from 'chai'
import * as path from 'path'

const ext = process.platform === 'win32' ? '.exe' : ''

describe('options', () => {
  describe('cwd', () => {
    it('should use process.cwd() if nothing is provided', () => {
      const options = normalizeOptions()
      expect(options.cwd).to.equal(process.cwd())
    })
    it('should use the main module in a package directory', () => {
      const options = normalizeOptions()
      expect(options.input).to.equal(path.resolve('./index.js'))
    })
    it('should resolve relative paths for input', () => {
      const options = normalizeOptions({ input: 'test/fixture/entry.js' })
      expect(options.input).to.equal(path.resolve('./test/fixture/entry.js'))
    })
    it('should accept a module entry as input', () => {
      const options = normalizeOptions({ input: 'test/fixture' })
      expect(options.input).to.equal(path.resolve('./test/fixture/entry.js'))
    })
    it('should resolve pathed options against cwd', () => {
      const cwd = path.join(process.cwd(), 'test/fixture')
      const options = normalizeOptions({
        cwd,
        input: 'entry',
        output: 'abc',
        temp: './d'
      })
      expect(options.temp).to.equal(path.resolve(cwd, './d'))
      expect(options.input).to.equal(path.resolve(cwd, 'entry.js'))
      expect(options.output).to.equal(path.resolve(cwd, `abc${ext}`))
    })
  })
  describe('output', () => {
    it('should work', () => {
      const options = normalizeOptions({
        output: './some-output'
      })
      expect(options.output).to.equal(path.resolve(`./some-output${ext}`))
    })
    it('should default to the input file name if not index', () => {
      const options = normalizeOptions({
        input: './test/fixture'
      })
      expect(options.output).to.equal(path.resolve(`./entry${ext}`))
    })
    it('should default to the folder/project name if filename is index', () => {
      const options = normalizeOptions()
      expect(options.output).to.equal(path.resolve(`./nexe${ext}`))
    })
  })
})
