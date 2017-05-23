import { normalize, join } from 'path'
import Bluebird from 'bluebird'
import { Buffer } from 'buffer'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { spawn } from 'child_process'
import { Stream as Needle } from 'nigel'
import logger from './logger'
import { deepEqual } from 'assert'
import {
  readFileAsync,
  writeFileAsync,
  fileExistsAsync,
  dequote,
  isWindows
} from './util'

const isBsd = Boolean(~process.platform.indexOf('bsd'))
const make = isWindows ? 'vcbuild.bat' : isBsd ? 'gmake' : 'make'
const configure = isWindows ? 'configure' : './configure'
const marker = Buffer.from('<nexe~sentinel>').toString('hex')
const needle = Buffer.from(marker)
const padLeft = (x, l, c = '0') => (c.repeat(l) + x).slice(-l)
const inflate = (value, size) => {
  if (!size | value.length >= size) {
    return value
  }
  return value + Array(size - value.length + 1).join(';')
}

export class NexeCompiler {
  constructor (options) {
    this.options = options
    logger.setLevel(options.loglevel)
    this.log = logger
    this.python = options.python
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

  _findPaddingSize (size, override) {
    if (override === 0) {
      return 0
    }
    size = override > size ? override : size
    const padding = [3, 6, 9, 16, 25, 40].map(x => x * 1e6)
      .filter(p => size <= p)[0]
    if (!padding) {
      throw new Error(`No prebuilt target large enough (${(size / 1024).toFixed(2)}Mb).\nUse the --build flag and build for the current platform`)
    }
    return padding
  }

  _getArtifactLocation (target) {
    if (target) {
      return join(this.options.temp, target)
    }

    return isWindows
      ? join(this.src, 'Release', 'node.exe')
      : join(this.src, 'out', 'Release', 'node')
  }

  _runBuildCommandAsync (command, args) {
    return new Bluebird((resolve, reject) => {
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
      [configure, ...this.options.configure]
    )
  }

  async _buildAsync () {
    if (this.options.clean) {
      await this._runBuildCommandAsync(make, ['clean'])
    }
    await this._configureAsync()
    const buildOptions = isWindows ? this.options.vcBuild : this.options.make
    await this._runBuildCommandAsync(make, buildOptions)
    return createReadStream(this._getArtifactLocation())
  }

  _fetchPrebuiltBinary () {
    /**
     * TODO implement hosted builds
     *  - CircleCI artifacts
     *  - AppVeyor windows build
     *  - Publish to github release from appveyor
     * github.io site build
     */
    return this._buildAsync()
  }

  _getPayload (header) {
    return this._serializeHeader(header) + this.input + '/**' + this.resources.bundle + `**/`
  }

  _generateHeader (paddingOverride) {
    const zeros = padLeft(0, 20)
    const header = {
      configure: this.options.configure.slice().sort(),
      make: this.options.make.slice().sort(),
      enableNodeCli: this.options.enableNodeCli,
      vcBuild: this.options.vcBuild.slice().sort(),
      resources: this.resources.index,
      contentSize: zeros,
      paddingSize: zeros,
      resourceOffset: zeros,
      binaryOffset: zeros
    }
    const serializedHeader = this._serializeHeader(header)
    header.contentSize = padLeft(Buffer.byteLength(this._getPayload(header)), 20)
    header.paddingSize = padLeft(this._findPaddingSize(+header.contentSize, paddingOverride), 20)
    header.resourceOffset = padLeft(Buffer.byteLength(serializedHeader + this.input + '/**'), 20)
    return header
  }

  async _getExistingBinaryHeaderAsync (target) {
    const filename = this._getArtifactLocation(target)
    const existingBinary = await fileExistsAsync(filename)
    if (existingBinary) {
      return this._extractHeaderAsync(filename)
    }
    return null
  }

  _extractHeaderAsync (path) {
    const haystack = createReadStream(path)
    const stream = new Needle(needle)
    let needles = 0
    let lastStack = null
    haystack.pipe(stream)
    return new Promise(resolve => {
      stream.on('needle', () => needles++)
        .on('haystack', x => {
          if (needles === 2) {
            haystack.close()
            stream.end()
            resolve(JSON.parse(lastStack.toString()))
          }
          lastStack = x
        }).on('close', () => resolve(null))
    })
  }

  _serializeHeader (header) {
    return `/**${marker}${JSON.stringify(header)}${marker}**/process.__nexe=${JSON.stringify(header)};/**${marker}**/`
  }

  _headersAreEqual (rhs, lhs) {
    const ignoreKeys = [
      'resourceOffset', 'binaryOffset', 'contentSize', 'resources'
    ].reduce((acc, c) => {
      acc[c] = true
      return acc
    }, {})
    rhs = Object.assign({}, rhs, ignoreKeys)
    lhs = Object.assign({}, lhs, ignoreKeys)
    try {
      deepEqual(rhs, lhs)
      return true
    } catch (e) { void e }
    return false
  }

  async setMainModule (compiler, next) {
    if (compiler.options.targets.length) {
      return
    }
    await next()
    const mainFile = await compiler.readFileAsync(`lib/${compiler.options.name}.js`)
    const header = compiler._generateHeader(compiler.options.padding)
    mainFile.contents = inflate(this._getPayload(header), +header.paddingSize) +
      '\n//' + marker
  }

  async compileAsync () {
    let target = this.options.targets.slice().shift() // TODO support multiple targets
    let prebuiltSource = null
    const header = this._generateHeader(this.options.padding)
    target = target && `${target}-${header.paddingSize}`
    const existingBinaryHeader = await this._getExistingBinaryHeaderAsync(target)

    if (existingBinaryHeader && this._headersAreEqual(header, existingBinaryHeader)) {
      prebuiltSource = createReadStream(this._getArtifactLocation(target))
    }

    if (target) {
      prebuiltSource = this._fetchPrebuiltBinary(target)
    }

    if (!prebuiltSource) {
      prebuiltSource = await this._buildAsync()
    }

    return this._assembleDeliverable(
      header,
      prebuiltSource
    )
  }

  _assembleDeliverable (header, binary) {
    const firstNeedle = Buffer.concat([Buffer.from('/**'), needle])
    const stream = new Needle(firstNeedle)
    const artifact = new Readable({ read () {} })
    let needles = 0
    let currentStackSize = 0
    binary.pipe(stream)
    stream.on('needle', () => {
      needles++
      stream.needle(needle)
    })
    .on('haystack', x => {
      if (needles < 1) {
        currentStackSize += x.length
        artifact.push(x)
      }
      if (needles === 1 && !+header.binaryOffset) {
        header.binaryOffset = padLeft(currentStackSize, 20)
        artifact.push(
          Buffer.from(
            inflate(this._getPayload(header), +header.paddingSize) +
            '\n//' + marker
          )
        )
      }
      if (needles > 3) {
        artifact.push(x)
      }
    }).on('close', () => artifact.push(null))
    return artifact
  }
}
