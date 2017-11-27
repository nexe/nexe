import got = require('got')
import download = require('download')
import {
  NodePlatform,
  NodeArch,
  platforms,
  architectures,
  NexeTarget,
  getTarget,
  targetsEqual
} from './target'
export { NexeTarget }

export interface GitAsset {
  name: string
  url: string
  browser_download_url: string
}

export interface GitRelease {
  tag_name: string
  assets_url: string
  upload_url: string
  assets: GitAsset[]
}

interface NodeRelease {
  version: string
}

async function getJson<T>(url: string, options?: any) {
  return JSON.parse((await got(url, options)).body) as T
}

function isBuildableVersion(version: string) {
  const major = +version.split('.')[0]
  return !~[0, 1, 2, 3, 4, 5, 7].indexOf(major)
}

export function getLatestGitRelease(options?: any) {
  return getJson<GitRelease>('https://api.github.com/repos/nexe/nexe/releases/latest', options)
}

export async function getUnBuiltReleases(options?: any) {
  const nodeReleases = await getJson<NodeRelease[]>(
    'https://nodejs.org/download/release/index.json'
  )
  const existingVersions = (await getLatestGitRelease(options)).assets.map(x => getTarget(x.name))

  const versionMap: { [key: string]: true } = {}
  return nodeReleases
    .reduce((versions: NexeTarget[], { version }) => {
      version = version.replace('v', '').trim()
      if (!isBuildableVersion(version) || versionMap[version]) {
        return versions
      }
      versionMap[version] = true
      platforms.forEach(platform => {
        architectures.forEach(arch => {
          if (arch === 'x86' && platform === 'mac') return
          if (arch === 'arm71' && platform !== 'linux') return
          versions.push(getTarget({ platform, arch, version }))
        })
      })
      return versions
    }, [])
    .filter(x => !existingVersions.some(t => targetsEqual(t, x)))
}
