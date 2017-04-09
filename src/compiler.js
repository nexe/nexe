const
  { dirname, normalize, join } = require('path'),
  { promisify, Promise, coroutine } = require('bluebird'),
  { normalizeOptions } = require('./options'),
  { readFile, writeFile, createReadStream } = require('fs'),
  { spawn } = require('child_process'),
  { logger } = require('./logger')

const
  isWindows = process.platform === 'win32',
  isBsd = Boolean(~process.platform.indexOf('bsd')),
  make = isWindows && 'vcbuild.bat' ||
    isBsd && 'gmake' ||
    'make',
  configure = isWindows ? 'configure' : './configure',
  readFileAsync = promisify(readFile),
  writeFileAsync = promisify(writeFile)

module.exports.NexeCompiler = class NexeCompiler {
  constructor (options) {
    options = this.options = normalizeOptions(options)
    logger.setLevel(options.loglevel)
    this.log = logger
    this.python = options.python
    this.configure = options.configure
    this.make = isWindows ? options.vcBuild : options.make
    this.src = join(options.temp, options.version)
    this.env = Object.assign({}, process.env)
    this.files = []

    this.readFileAsync = coroutine(function * (file) {
      const cachedFile = this.files.find(x => normalize(x.filename) === normalize(file))
      if (cachedFile) {
        return Promise.resolve(cachedFile)
      }
      this.files.push({
        filename: file,
        contents: yield readFileAsync(join(this.src, file), 'utf-8').catch(e => {
          if (e.code !== 'ENOENT') {
            throw e
          }
          return ''
        })
      })
      return this.readFileAsync(file)
    }.bind(this))
    this.writeFileAsync = (file, contents) => writeFileAsync(join(this.src, file), contents)
  }

  set python (pythonPath) {
    if (!pythonPath) {
      return
    }
    if (isWindows) {
      this.env.PATH = this.env.PATH + ';' + normalize(dirname(pythonPath))
    } else {
      this.env.PYTHON = pythonPath
    }
  }

  get _deliverableLocation () {
    return isWindows
      ? join(this.src, 'Release', 'node.exe')
      : join(this.src, 'out', 'Release', 'node')
  }

  _runBuildCommandAsync (command, args) {
    return new Promise((resolve, reject) => {
      spawn(command, args, {
        cwd: this.src,
        env: this.env,
        stdio: 'ignore'
      })
      .once('error', reject)
      .once('close', resolve)
    })
  }

  _configureAsync () {
    return this._runBuildCommandAsync(
      this.env.PYTHON || 'python',
      [configure, ...this.configure]
    )
  }

  buildAsync () {
    return this._configureAsync()
      .then(() => this._runBuildCommandAsync(make, this.make))
  }

  getDeliverableAsync () {
    return Promise.resolve(createReadStream(this._deliverableLocation))
  }
}
