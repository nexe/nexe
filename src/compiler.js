import { normalize, join } from 'path'
import { Promise } from 'bluebird'
import { createReadStream } from 'fs'
import { spawn } from 'child_process'
import * as logger from './logger'
import { readFileAsync, writeFileAsync, dequote } from './util'

const isWindows = process.platform === 'win32'
const isBsd = Boolean(~process.platform.indexOf('bsd'))
const make = isWindows ? 'vcbuild.bat' : isBsd ? 'gmake' : 'make'
const configure = isWindows ? 'configure' : './configure'

export class NexeCompiler {
  constructor (options) {
    this.options = options
    logger.setLevel(options.loglevel)
    this.log = logger
    this.python = options.python
    this.configure = options.configure
    this.make = isWindows ? options.vcBuild : options.make
    this.src = join(options.temp, options.version)
    this.env = Object.assign({}, process.env)
    this.files = []

    this.readFileAsync = async (file) => {
      let cachedFile = this.files.find(x => normalize(x.filename) === normalize(file))
      if (!cachedFile) {
        cachedFile = {
          filename: file,
          contents: await readFileAsync(join(this.src, file), 'utf-8')
            .catch({ code: 'ENOENT' }, () => '')
        }
        this.files.push(cachedFile)
      }
      return cachedFile
    }
    this.writeFileAsync = (file, contents) => writeFileAsync(join(this.src, file), contents)
  }

  set python (pythonPath) {
    if (!pythonPath) {
      return
    }
    if (isWindows) {
      this.env.PATH = this.env.PATH + ';"' + dequote(normalize(pythonPath)) + '"'
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

  async buildAsync () {
    await this._configureAsync()
    return this._runBuildCommandAsync(make, this.make)
  }

  getDeliverableAsync () {
    return Promise.resolve(createReadStream(this._deliverableLocation))
  }
}
