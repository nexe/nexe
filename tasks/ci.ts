import { NexeTarget } from '../lib/releases'
import got = require('got')
import * as assert from 'assert'
const { env } = process

export function triggerMacBuild(release: NexeTarget, branch: string) {
  assert.ok(env.CIRCLE_TOKEN)
  const circle = `https://circleci.com/api/v1.1/project/github/nexe/nexe/tree/${branch}?circle-token=${
    env.CIRCLE_TOKEN
  }`
  return got(circle, {
    json: true,
    body: {
      build_parameters: {
        NEXE_VERSION: release.toString()
      }
    }
  })
}

export function triggerDockerBuild(release: NexeTarget, branch: string) {
  assert.ok(env.TRAVIS_TOKEN)
  const travis = `https://api.travis-ci.org/repo/nexe%2Fnexe/requests`
  return got(travis, {
    json: true,
    body: {
      request: {
        branch: branch,
        config: {
          merge_mode: 'deep_merge',
          env: {
            //use matrix so that secure global variable is merged
            matrix: {
              NEXE_VERSION: release.toString()
            }
          }
        }
      }
    },
    headers: {
      'Travis-API-Version': '3',
      Authorization: `token ${env.TRAVIS_TOKEN}`
    }
  })
}

export function triggerWindowsBuild(release: NexeTarget) {
  const hasVersion = 'NEXE_VERSION' in env
  env.NEXE_VERSION = hasVersion ? env.NEXE_VERSION!.trim() : release.toString()
  return Promise.resolve()
}
