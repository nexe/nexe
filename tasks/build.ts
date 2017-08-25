import { compile } from '../'
import got = require('got')

const env = process.env,
  branchName = env.CIRCLE_BRANCH || env.APPVEYOR_REPO_BRANCH,
  isScheduled = Boolean(env.APPVEYOR_SCHEDULED_BUILD),
  isWindows = branchName.includes('win32') && Boolean(env.APPVEYOR),
  isPullRequest = Boolean(env.CIRCLE_PR_NUMBER) || Boolean(env.APPVEYOR_PULL_REQUEST_NUMBER)

async function main () {
  if (isScheduled) {
    const releases = await
  }
}

main().catch(x => {
  console.error(x)
  process.exit(1)
})
