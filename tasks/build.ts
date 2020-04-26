import * as nexe from '../lib/nexe'
import { getUnBuiltReleases, getLatestGitRelease } from '../lib/releases'
import { runDockerBuild } from './docker'
import { getTarget, targetsEqual, NexeTarget } from '../lib/target'
import { pathExistsAsync, readFileAsync, execFileAsync, semverGt } from '../lib/util'
import got = require('got')
import { cpus } from 'os'

const env = process.env,
  isPullRequest = env.BUILD_REASON === 'PullRequest',
  isWindows = process.platform === 'win32',
  isLinux = process.platform === 'linux',
  buildHost = env.AGENT_JOBNAME || (isWindows && 'windows_2017_2015') || '',
  isMac = process.platform === 'darwin',
  headers = {
    Authorization: 'token ' + env.GITHUB_TOKEN,
    'User-Agent': 'nexe (https://www.npmjs.com/package/nexe)',
  }

if (require.main === module) {
  if (!isPullRequest) {
    build().catch((x) => {
      console.error(x)
      process.exit(1)
    })
  }
}

async function build() {
  const releases = await getUnBuiltReleases({ headers })
  if (!releases.length) {
    return
  }
  const windowsBuild = releases.find((x) => x.platform === 'windows'),
    macBuild = releases.find((x) => x.platform === 'mac'),
    linux = releases.find((x) => x.platform === 'linux'),
    alpine = releases.find((x) => x.platform === 'alpine')

  let target: NexeTarget | undefined

  if (env.NEXE_VERSION) target = getTarget(env.NEXE_VERSION)
  else if (isWindows) target = windowsBuild
  else if (isMac) target = macBuild
  else if (isLinux) target = linux
  if (buildHost.includes('alpine')) target = alpine

  if (!target) {
    return console.log('Nothing to build...')
  }

  if (isWindows && buildHost.includes('2017') && !semverGt(target.version, '9.99.99')) {
    return console.log(`Not building ${target} on this host...`)
  }
  if (isWindows && buildHost.includes('2015') && semverGt(target.version, '9.99.99')) {
    return console.log(`Not building ${target} on this host...`)
  }

  const output = isWindows ? './out.exe' : './out',
    options = {
      mangle: false,
      build: true,
      verbose: Boolean(env.NEXE_VERBOSE!),
      target,
      make: ['-j' + cpus().length],
      output,
    }
  console.log('Building: ' + target + ' on ' + buildHost)
  const stop = keepalive()

  if (
    [/*'arm7l', 'arm6l', 'arm64', */ 'alpine'].includes(target.platform) &&
    buildHost.includes('alpine')
  ) {
    await runDockerBuild(target)
  } else {
    await nexe.compile(options)
  }
  stop()
  if (await pathExistsAsync(output)) {
    await assertNexeBinary(output)
    const gitRelease = await getLatestGitRelease({ headers }),
      unbuiltReleases = await getUnBuiltReleases({ headers })
    if (!unbuiltReleases.some((x) => targetsEqual(x, target!))) {
      console.log(`${target} already uploaded.`)
      process.exit(0)
      return
    }
    await got(gitRelease.upload_url.split('{')[0], {
      query: { name: target.toString() },
      body: await readFileAsync(output),
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
      },
    }).catch((reason) => {
      console.log(reason && reason.response && reason.response.body)
      throw reason
    })
    console.log(target + ' uploaded.')
    process.exit(0)
  }
}

function keepalive() {
  const keepalive = setInterval(() => console.log('Building...'), 300 * 1000)
  return () => clearInterval(keepalive)
}

function assertNexeBinary(file: string) {
  return execFileAsync(file).catch((e) => {
    if (e && e.stack && e.stack.includes('Invalid Nexe binary')) {
      return
    }
    throw e
  })
}
