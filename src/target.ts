export type NodePlatform = 'windows' | 'mac' | 'alpine' | 'linux'
export type NodeArch = 'x86' | 'x64' | 'arm71'

const platforms: NodePlatform[] = ['windows', 'mac', 'alpine', 'linux'],
  architectures: NodeArch[] = ['x86', 'x64', 'arm71']

export { platforms, architectures }

export interface NexeTarget {
  version: string
  platform: NodePlatform | string
  arch: NodeArch | string
}

//TODO bsd
const prettyPlatform: { [key: string]: NodePlatform } = {
  win32: 'windows',
  windows: 'windows',
  win: 'windows',
  darwin: 'mac',
  macos: 'mac',
  mac: 'mac',
  linux: 'linux',
  static: 'alpine',
  alpine: 'alpine'
}

//TODO arm
const prettyArch: { [key: string]: NodeArch } = {
  x86: 'x86',
  arm: 'arm71',
  arm7: 'arm71',
  arm71: 'arm71',
  amd64: 'x64',
  ia32: 'x86',
  x32: 'x86',
  x64: 'x64'
}

function isVersion(x: string) {
  if (!x) {
    return false
  }
  return /^[\d]+$/.test(x.replace(/v|\.|\s+/g, ''))
}

function isPlatform(x: string): x is NodePlatform {
  return x in prettyPlatform
}

function isArch(x: string): x is NodeArch {
  return x in prettyArch
}

class Target implements NexeTarget {
  constructor(public arch: NodeArch, public platform: NodePlatform, public version: string) {}
  toJSON() {
    return this.toString()
  }
  toString() {
    return `${this.platform}-${this.arch}-${this.version}`
  }
}

export function targetsEqual(a: NexeTarget, b: NexeTarget) {
  return a.arch === b.arch && a.platform === b.platform && a.version === b.version
}

export function getTarget(target: string | Partial<NexeTarget> = ''): NexeTarget {
  const currentArch = process.arch
  let arch = currentArch in prettyArch ? prettyArch[process.arch] : (process.arch as NodeArch),
    platform = prettyPlatform[process.platform],
    version = process.version.slice(1)

  if (typeof target !== 'string') {
    target = `${target.platform}-${target.arch}-${target.version}`
  }

  target
    .toLowerCase()
    .split('-')
    .forEach(x => {
      if (isVersion(x)) {
        version = x.replace(/v/g, '')
      }
      if (isPlatform(x)) {
        platform = prettyPlatform[x]
      }
      if (isArch(x)) {
        arch = prettyArch[x]
      }
    })

  return new Target(arch, platform, version)
}
