import Mfs from 'memory-fs'
import webpack from 'webpack'
import { fromCallback } from 'bluebird'
import { resolveModule } from './util'
import { resolve, join } from 'path'
import module from 'module'
import 'json-loader'
import 'html-loader'

const isObject = (x) => typeof x === 'object'
const isString = (x) => typeof x === 'string'

function loadModule (path) {
  console.log('loading module!!!!', path)
  return module._load(path, module, false)
}

export default async function bundle (compiler, next) {
  let bundleConfig = compiler.options.bundle
  if (!bundleConfig) {
    return next()
  }

  const input = compiler.options.input || resolveModule(process.cwd())
  const mfs = new Mfs()
  const path = resolve('nexe')
  const filename = 'virtual-bundle.js'

  if (isString(bundleConfig)) {
    bundleConfig = loadModule(relative(process.cwd(), bundleConfig))
  } else if (!isObject(bundleConfig)) {
    bundleConfig = {
      entry: resolve(input),
      target: 'node',
      module: {
        rules: [
          { test: /\.html$/, use: 'html-loader' },
          { test: /\.json$/, use: 'json-loader' }
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
