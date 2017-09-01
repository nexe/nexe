import * as nexe from '../src/nexe'
import {
  getUnBuiltReleases,
  getLatestGitRelease
} from '../src/releases'
import * as ci from './ci'
import { runAlpineBuild } from './docker'
import { getTarget } from '../src/target'
import { pathExistsAsync, statAsync, readFileAsync, execFileAsync } from '../src/util'
import got = require('got')

const env = process.env,
  branchName = env.CIRCLE_BRANCH || env.APPVEYOR_REPO_BRANCH || env.TRAVIS_BRANCH || '',
  isScheduled = Boolean(env.APPVEYOR_SCHEDULED_BUILD || env.NEXE_TRIGGERED),
  isLinux = Boolean(env.CIRCLECI),
  isWindows = Boolean(env.APPVEYOR),
  isMac = Boolean(env.TRAVIS),
  isPullRequest = Boolean(env.CIRCLE_PR_NUMBER)
    || Boolean(env.APPVEYOR_PULL_REQUEST_NUMBER) 
    || Boolean(env.TRAVIS_PULL_REQUEST_BRANCH),
  headers = { 
    'Authorization': 'token ' + env.GITHUB_TOKEN,
    'User-Agent': 'nexe (https://www.npmjs.com/package/nexe)'
  }

if (require.main === module) {
  if (!isPullRequest) {
    build().catch(x => {
      console.error(x)
      process.exit(1)
    })
  }
}

async function build () {
  if (isScheduled) {
    const releases = await getUnBuiltReleases({ headers })
    if (!releases.length) {
      return
    }
    const windowsBuild = releases.find(x => x.platform === 'windows')
    const macBuild = releases.find(x => x.platform === 'mac')
    const linuxOrAlpine = releases.find(x => x.platform === 'linux' || x.platform === 'alpine')

    if (linuxOrAlpine) {
      await ci.triggerDockerBuild(linuxOrAlpine, branchName)
    }
    if (macBuild) {
      await ci.triggerMacBuild(macBuild, branchName)
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
        target,
        output
      }
    
    const stop = keepalive()
    if (target.platform === 'alpine') {
      await runAlpineBuild(target, nexe.version.split('.')[0])
    } else {
      await nexe.compile(options)      
    }
    stop()
    
    
    if (await pathExistsAsync(output)) {
      await assertNexeBinary(output)
      const gitRelease = await getLatestGitRelease({ headers })
      await got(gitRelease.upload_url.split('{')[0], {
        query: { name: target.toString() },
        body: await readFileAsync(output),
        headers: {
          'Authorization': 'token ' + env.GITHUB_TOKEN,
          'Content-Type': 'application/octet-stream',
          'User-Agent': 'nexe (https://www.npmjs.com/package/nexe)'
        }
      })
      console.log(target + ' uploaded.')
    }
  }
}

function keepalive () {
  const keepalive = setInterval(() => console.log('Building...'), 300 * 1000)
  return () => clearInterval(keepalive)
}

function assertNexeBinary (file: string) {
  return execFileAsync(file).catch(e => {
    if (e && e.stack && e.stack.includes('Invalid Nexe binary')) {
      return
    }
    throw e
  })
}
