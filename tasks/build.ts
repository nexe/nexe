import { compile } from '../src/nexe'
import { 
  getUnBuiltReleases, 
  getLatestGitRelease 
} from '../src/releases'
import * as ci from './ci'
import { getTarget } from '../src/target'
import { pathExistsAsync, statAsync, readFileAsync, execFileAsync } from '../src/util'
import got = require('got')

const env = process.env,
  branchName = env.CIRCLE_BRANCH || env.APPVEYOR_REPO_BRANCH,
  isScheduled = Boolean(env.APPVEYOR_SCHEDULED_BUILD || env.NEXE_TRIGGERED),
  isLinux = Boolean(env.TRAVIS),
  isWindows = Boolean(env.APPVEYOR),
  isMac = Boolean(env.CIRCLECI),
  isPullRequest = Boolean(env.CIRCLE_PR_NUMBER) || Boolean(env.APPVEYOR_PULL_REQUEST_NUMBER)

async function build () {
  if (isScheduled) {
    const releases = await getUnBuiltReleases()
    if (!releases.length) {
      return
    }
    const windowsBuild = releases.find(x => x.platform === 'windows')
    const macBuild = releases.find(x => x.platform === 'mac')
    const linuxOrAlpine = releases.find(x => x.platform === 'linux' || x.platform === 'alpine')

    if (linuxOrAlpine) {
      await ci.triggerDockerBuild(linuxOrAlpine)
    }
    if (macBuild) {
      await ci.triggerMacBuild(macBuild)
    }
    if (windowsBuild) {
      await ci.triggerWindowsBuild(windowsBuild)
    }
  }

  if (env.NEXE_VERSION) {
    const 
      target = getTarget(env.NEXE_VERSION),
      output = isWindows ? './out.exe' : './out',
      options = {
        empty: true,
        build: true,
        make: [target.arch],
        version: target.version,
        output
      }
    if (isWindows) {
      await compile(options)
    }

    if (isMac) {
      await compile(options)
    }

    if (isLinux) {}

    if (await pathExistsAsync(output)) {
      await assertNexeBinary(output)
      const gitRelease = await getLatestGitRelease()
      await got(gitRelease.upload_url.split('{')[0], {
        query: { name: target.toString() },
        body: await readFileAsync(output),
        headers: {
          'Authorization': 'token ' + env.GITHUB_TOKEN,
          'Content-Type': 'application/octet-stream'
        }
      })
      console.log(target + ' uploaded.')
    }
  }
}

function assertNexeBinary (file: string) {
  return execFileAsync(file).catch(e => {
    if (e && e.stack && e.stack.includes('Invalid Nexe binary')) {
      return
    }
    throw e
  })
}

if (require.main === module) {
  build().catch(x => {
    console.error(x)
    process.exit(1)
  })
}
