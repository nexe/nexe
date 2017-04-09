const Mfs = require('memory-fs'),
  webpack = require('webpack'),
  { fromCallback } = require('bluebird'),
  { resolve, join, relative } = require('path'),
  isObject = (x) => typeof x === 'object',
  isString = (x) => typeof x === 'string'

function* bundle (compiler, next) {
  let bundleConfig = compiler.options.bundle
  if (!bundleConfig) {
    return next()
  }

  const
    input = compiler.options.input || require.resolve(process.cwd()),
    fs = new Mfs(),
    path = resolve('nexe'),
    filename = 'virtual-bundle.js'

  if (isString(bundleConfig)) {
    bundleConfig === require(relative(process.cwd(), bundleConfig))
  } else if (!isObject(bundleConfig)) {
    bundleConfig = {
      entry: resolve(input),
      target: 'node',
      output: { path, filename }
    }
  }

  const bundler = webpack(bundleConfig)
  bundler.outputFileSystem = fs
  const stats = yield fromCallback(cb => bundler.run(cb))

  if (stats.hasErrors()) {
    compiler.log.error(stats.toString())
    return null
  }
  //eslint-disable-next-line no-sync
  compiler.input = fs.readFileSync(
    join(bundleConfig.output.path, bundleConfig.output.filename)
  )

  return next()
}

module.exports.bundle = bundle
