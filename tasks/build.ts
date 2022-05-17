import { env } from 'node:process'
import { execSync } from 'node:child_process'
import { buildArm, buildAlpine } from './docker.js'

export async function build(target = env.NEXE_TARGET || null) {
  if (!target?.trim()) {
    throw new Error('Environment variable NEXE_TARGET not found. Received: ' + target)
  }

  const done = keepalive()
  let file = ''
  try {
    if (target.includes('alpine')) {
      file = await buildAlpine(target)
    } else if (target.includes('arm')) {
      file = await buildArm(target)
    } else {
      file = await nexeBuild(target)
      assertNexeBinary(file)
    }
  } catch (e: any) {
    done()
    throw e
  }

  if (!file) {
    throw new Error('Binary failed to build')
  }

  uploadBinary(target, file)
}

function nexeBuild(target: string) {
  console.log('building: ' + target)
  return Promise.resolve('')
}

function uploadBinary(target: string, file: string) {
  void file
  console.log('uploading to release')
}

function keepalive() {
  const keepalive = setInterval(() => console.log('Building...'), 300 * 1000)
  return () => clearInterval(keepalive)
}

function assertNexeBinary(file: string) {
  if (!file) throw new Error('Invalid filename: "' + file + '"')
  let result = ''
  try {
    result = execSync(file).toString('utf8')
  } catch (e: any) {
    if (e && e.stack && e.stack.includes('Invalid Nexe binary')) {
      return
    }
    throw e
  }
  throw new Error('Not a bare nexe binary: ' + result)
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
