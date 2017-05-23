import Mfs from 'memory-fs'
import webpack from 'webpack'
import { fromCallback } from 'bluebird'
import { resolve, join, relative } from 'path'

const isObject = (x) => typeof x === 'object'
const isString = (x) => typeof x === 'string' || x instanceof String

export default async function bundle (compiler, next) {
  let bundleConfig = compiler.options.bundle
  if (!bundleConfig) {
    return next()
  }

  const inputFilePath = compiler.options.input || require.resolve(process.cwd())
  const mfs = new Mfs()
  const path = resolve('nexe')
  const filename = 'virtual-bundle.js'

  if (isString(bundleConfig)) {
    bundleConfig = require(relative(process.cwd(), bundleConfig))
  } else if (!isObject(bundleConfig)) {
    bundleConfig = {
      entry: resolve(inputFilePath),
      target: 'node',
      module: {
        rules: [
          { test: /\.html$/, use: 'html-loader' },
          { test: /\.json$/, use: 'json-loader' },
          { test: /\.node$/, use: 'xbin-loader' },
          { test: /license$|\.md$/, use: 'raw-loader' }
        ]
      }
    }
  }

  bundleConfig.output = { path, filename }

  const bundler = webpack(bundleConfig)
  bundler.outputFileSystem = mfs
  const stats = await fromCallback(cb => bundler.run(cb))

  if (stats.hasErrors()) {
    compiler.log.error(stats.toString())
    return null
  }

  compiler.input = mfs.readFileSync(
    join(bundleConfig.output.path, bundleConfig.output.filename)
  )

  return next()
}
