import { extract as unTar } from 'tar'
import request from 'request'
import Bluebird from 'bluebird'
import { stat } from 'fs'
import rimraf from 'rimraf'

const statAsync = Bluebird.promisify(stat)
const rimrafAsync = Bluebird.promisify(rimraf)

function progress (req, log, precision = 10) {
  const logged = {}
  let length = 0
  let total = 1

  return req.on('response', (res) => {
    total = res.headers['content-length']
  }).on('data', (chunk) => {
    length += chunk.length
    const percentComplete = +(length / total * 100).toFixed()
    if (percentComplete % precision === 0 && !logged[percentComplete]) {
      logged[percentComplete] = true
      log(percentComplete)
    }
  })
}

function fetchNodeSource (cwd, url, log) {
  log.info('Downloading Node: ' + url)
  return new Bluebird((resolve, reject) => {
    progress(request.get(url), (pc) => {
      log.verbose(`Downloading and Extracting Node: ${pc}%...`)
      if (pc === 100) {
        log.info('Complete...')
      }
    }).on('error', reject)
      .pipe(unTar({ x: 1, strip: 1, cwd }))
      .on('error', reject)
      .on('close', () => resolve(log.info('Extracted to: ' + cwd)))
  })
}

function cleanSrc (clean, src, log) {
  if (clean === true) {
    log.info('Removing source: ' + src)
    return rimrafAsync(src).then(() => {
      log.info('Source deleted.' + src)
    })
  }
  return Bluebird.resolve()
}

/**
 * Downloads the node source to the configured temporary directory
 * @param {*} compiler
 * @param {*} next
 */
export default function download (compiler, next) {
  const { src, log } = compiler
  const { version, sourceUrl, clean } = compiler.options
  const url = sourceUrl || `https://nodejs.org/dist/v${version}/node-v${version}.tar.gz`

  return cleanSrc(clean, src, log).then(() => statAsync(src).then(
    x => !x.isDirectory() && fetchNodeSource(src, url, log),
    e => {
      if (e.code !== 'ENOENT') {
        throw e
      }
      return fetchNodeSource(src, url, log)
    }
  )).then(next)
}
