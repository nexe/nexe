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
    it('should resolve pathed options against cwd', () => {
      const cwd = '/a/b/c'
      const options = normalizeOptions({
        cwd,
        input: '123.js',
        output: 'abc',
        temp: './d'
      })
      expect(options.temp).to.equal(path.resolve(cwd, './d'))
      expect(options.input).to.equal(path.resolve(cwd, '123.js'))
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
        input: 'src/folder/app.js'
      })
      expect(options.output).to.equal(path.resolve(`./app${ext}`))
    })
    it('should default to the folder/project name if filename is index', () => {
      const options = normalizeOptions()
      expect(options.output).to.equal(path.resolve(`./nexe${ext}`))
    })
  })
})
