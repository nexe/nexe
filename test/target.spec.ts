import { padRight, isWindows } from '../src/util'
import { expect } from 'chai'
import chalk from 'chalk'
import { getTarget, NexeTarget } from '../src/target'
const b = chalk.blue
const arch = process.arch === 'ia32' ? 'x86' : process.arch

describe('Targets', () => {
  ;[
    ['win-ia32-6.11.2', 'windows-x86-6.11.2'],
    [{ version: '6.11.2', platform: 'win', arch: 'ia32' }, 'windows-x86-6.11.2'],
    ['win32-x64-6.11.2', 'windows-x64-6.11.2'],
    ['win-amd64-6.11.2', 'windows-x64-6.11.2'],
    ['darwin-x64-v8.4.0', 'mac-x64-8.4.0'],
    ['macos-x64-v8.4.0', 'mac-x64-8.4.0'],
    ['static-x86-6.10.3', 'alpine-x86-6.10.3'],
    ['linux-x32', `linux-x86-${process.version.slice(1)}`],
    ['alpine-notsupported-6.10.3', `alpine-${arch}-6.10.3`],
    ['not-a-thing', getTarget(process).toString()]
  ].forEach(([input, expected]) => {
    it(`should accept: ${padRight(JSON.stringify(input), 53)} ${b('->')}   ${expected}`, () => {
      expect(getTarget(input).toString()).to.equal(expected)
    })
  })

  it('should stringify and toString', () => {
    expect(JSON.stringify(getTarget(process))).to.equal(`"${getTarget(process)}"`)
  })
})
