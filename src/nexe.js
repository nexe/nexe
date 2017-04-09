const
  { compose } = require('app-builder'),
  { bundle } = require('./bundle'),
  { NexeCompiler } = require('./compiler'),
  { options } = require('./options'),
  { cli } = require('./cli'),
  { download } = require('./download'),
  { artifacts } = require('./artifacts'),
  { patches } = require('./patches'),
  { EOL } = require('os'),
  { coroutine, Promise } = require('bluebird'),
  { logger } = require('./logger')

function wrap (fns) {
  return [].concat(...fns).map(fn => {
    return fn.constructor.name === 'GeneratorFunction'
      ? coroutine(fn) : fn
  })
}

function compile (compilerOptions, callback) {
  const compiler = new NexeCompiler(compilerOptions)

  compiler.log.verbose('Compiler options:' +
    EOL + JSON.stringify(compiler.options, null, 4)
  )

  const nexe = compose(wrap([
    bundle,
    cli,
    download,
    (nexeCompiler, next) => {
      return next().then(() => {
        return nexeCompiler.buildAsync()
      })
    },
    artifacts,
    patches,
    compiler.options.patches
  ]))
  return Promise.resolve(nexe(compiler)).asCallback(callback)
}

module.exports.options = options
module.exports.compile = compile

if (require.main === module || process.__nexe) {
  compile(options).catch((e) => {
    logger.error(e.stack, () => process.exit(1))
  })
}
