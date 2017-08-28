import got = require('got')
import {
  NodePlatform,
  NodeArch,
  platforms,
  architectures,
  NexeTarget,
  getTarget,
  targetsEqual,
} from '../src/target'
export { NexeTarget }

export interface GitRelease {
  tag_name: string
  assets_url: string
  upload_url: string
  assets: Array<{ name: string }>
}

interface NodeRelease {
  version: string
}

async function getJson<T> (url: string) {
  return JSON.parse((await got(url)).body) as T
}

//TODO only build the latest of each major...?
function isBuildableVersion (version: string) {
  const major = +version.split('.')[0]
  return ![0, 1, 2, 3, 4, 5, 7].includes(major)
    || version === '4.8.4'
}

export function getLatestGitRelease () {
  return getJson<GitRelease>('https://api.github.com/repos/nexe/nexe/releases/latest')
}

export async function getUnBuiltReleases () {
  const nodeReleases = (await getJson<NodeRelease[]>('https://nodejs.org/download/release/index.json'))
  const existingVersions = (await getLatestGitRelease())
    .assets.map(x => getTarget(x.name))

  const versionMap: { [key:string]: true } = {}
  return nodeReleases.reduce((versions: NexeTarget[], { version }) => {
    version = version.replace('v', '').trim()
    if (!isBuildableVersion(version) || versionMap[version]) {
      return versions
    }
    versionMap[version] = true
    platforms.forEach(platform => {
      architectures.forEach(arch => {
        if (arch === 'x86' && platform === 'mac') return
        versions.push(getTarget({ platform, arch, version }))
      })
    })
    return versions
  }, [])
  .filter(
    x => !existingVersions.some(t => targetsEqual(t, x))
  )
}
