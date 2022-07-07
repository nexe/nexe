import { dirname } from 'node:path'

import download from 'download'

import { pathExists } from '../util.js'
import type { LogStep } from '../logger.js'
import type { NexeCompiler } from '../compiler.js'
import { NexeError } from '../compiler.js'

import type { IncomingMessage } from 'node:http'

function fetchNodeSourceAsync(dest: string, url: string, step: LogStep, options = {}) {
  const setText = (p: number) => step.modify(`Downloading Node: ${p.toFixed()}%...`)
  return download(url, dest, Object.assign(options, { extract: true, strip: 1 }))
    .on('response', (res: IncomingMessage) => {
      const total = Number(res.headers['content-length'])
      let current = 0
      res.on('data', (data) => {
        current += data.length
        setText((current / total) * 100)
        if (current === total) {
          step.log('Extracting Node...')
        }
      })
    })
    .then(() => step.log(`Node source extracted to: ${dest}`))
}

async function fetchPrebuiltBinary(compiler: NexeCompiler, step: any) {
  const { target, remoteAsset } = compiler,
    filename = compiler.getNodeExecutableLocation(target)

  try {
    await download(remoteAsset, dirname(filename), compiler.options.downloadOptions).on(
      'response',
      (res: IncomingMessage) => {
        const total = Number(res.headers['content-length'])
        let current = 0
        res.on('data', (data) => {
          current += data.length
          step?.modify(`Downloading...${((current / total) * 100).toFixed()}%`)
        })
      }
    )
  } catch (e: any) {
    if (e.statusCode === 404) {
      throw new NexeError(`${remoteAsset} is not available, create it using the --build flag`)
    } else {
      throw new NexeError('Error downloading prebuilt binary: ' + e)
    }
  }
}

/**
 * Downloads the node source to the configured temporary directory
 * @param {*} compiler
 * @param {*} next
 */
export default async function downloadNode(compiler: NexeCompiler, next: () => Promise<void>) {
  const { src, log, target } = compiler,
    { version } = target,
    { sourceUrl, downloadOptions, build } = compiler.options,
    url = sourceUrl || `https://nodejs.org/dist/v${version}/node-v${version}.tar.gz`,
    step = log.step(
      `Downloading ${build ? '' : 'pre-built '}Node.js${build ? ` source from: ${url}` : ''}`
    ),
    exeLocation = compiler.getNodeExecutableLocation(build ? undefined : target),
    downloadExists = await pathExists(build ? src : exeLocation)

  if (downloadExists) {
    step.log('Already downloaded...')
    return await next()
  }

  if (build) {
    await fetchNodeSourceAsync(src, url, step, downloadOptions)
  } else {
    await fetchPrebuiltBinary(compiler, step)
  }

  return await next()
}
