import { each, fromCallback } from 'bluebird'
import { readFileAsync } from './util'
import { Buffer } from 'buffer'
import globs from 'globby'
import { stat } from 'fs'

async function isDirectoryAsync (path) {
  const stats = await fromCallback(cb => stat(path, cb))
  return stats.isDirectory()
}

export default async function resource (compiler, next) {
  const resources = compiler.resources = {
    index: {},
    bundle: ''
  }

  if (!compiler.options.resources.length) {
    return next()
  }

  await each(globs(compiler.options.resources), async (file) => {
    if (await isDirectoryAsync(file)) {
      return
    }
    const contents = await readFileAsync(file)
    const encodedContents = contents.toString('base64')
    resources.index[file] = [
      Buffer.byteLength(resources.bundle),
      Buffer.byteLength(encodedContents)
    ]
    resources.bundle = resources.bundle + encodedContents
  })
  return next()
}
