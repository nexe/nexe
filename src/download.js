import download from 'download'
import { isDirectoryAsync } from './util'

function fetchNodeSourceAsync (cwd, url, step, options = {}) {
  const setText = (p) => step.modify(`Downloading Node: ${p.toFixed()}%...`)
  return download(url, cwd, Object.assign(options, { extract: true, strip: 1 }))
    .on('response', res => {
      const total = +res.headers['content-length']
      let current = 0
      res.on('data', data => {
        current += data.length
        setText((current / total) * 100)
        if (current === total) {
          step.log('Extracting Node...')
        }
      })
    })
    .then(
      () => step.log(`Node source extracted to: ${cwd}`)
    )
}

/**
 * Downloads the node source to the configured temporary directory
 * @param {*} compiler
 * @param {*} next
 */
export default async function downloadNode (compiler, next) {
  const { src, log } = compiler
  const { version, sourceUrl, downloadOptions } = compiler.options
  const url = sourceUrl || `https://nodejs.org/dist/v${version}/node-v${version}.tar.gz`
  const step = log.step(`Downloading Node.js source from: ${url}`)
  if (await isDirectoryAsync(src)) {
    step.log('Source already downloaded')
    return next()
  }

  return fetchNodeSourceAsync(src, url, step, downloadOptions).then(next)
}
