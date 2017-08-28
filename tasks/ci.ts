import { NexeTarget } from './releases'
import got = require('got')
import * as assert from 'assert'
const { env } = process

export function triggerDockerBuild(release: NexeTarget) {
  return Promise.resolve()
  // assert.ok(env.TRAVIS_TOKEN)
  // const travis = `https://api.travis-ci.org/repo/nexe/nexe/requests`
  // return got(travis, {
  //   json: true,
  //   body: {
  //     request: {
  //       branch: 'master',
  //       config: {
  //         merge_mode: 'deep_merge',
  //         env: {
  //           NEXE_VERSION: release
  //         }
  //       }
  //     }
  //   },
  //   headers: {
  //     'Travis-API-Version': '3',
  //     'Authorization': `token ${env.TRAVIS_TOKEN}`
  //   }
  // })
}

export function triggerMacBuild (release: NexeTarget) {
  return Promise.resolve()
  // assert.ok(env.CIRCLE_TOKEN)
  // const circle = `https://circleci.com/api/v1.1/project/github/nexe/nexe/tree/master?circle-token=${env.CIRCLE_TOKEN}`
  // return got(circle, {
  //   json: true,
  //   body: {
  //     build_parameters: {
  //       NEXE_VERSION: release
  //     }
  //   }
  // })
}

export function triggerWindowsBuild (release: NexeTarget) {
  return Promise.resolve(env.NEXE_VERSION = release.toString())
}
