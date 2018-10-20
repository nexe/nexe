import { delimiter, dirname, normalize, join } from 'path'
import { Buffer } from 'buffer'
import { createReadStream } from 'fs'
import { Readable, Stream } from 'stream'
import { spawn } from 'child_process'
import { Logger, LogStep } from './logger'
import {
  readFileAsync,
  writeFileAsync,
  pathExistsAsync,
  dequote,
  isWindows,
  bound,
  semverGt
} from './util'
import { NexeOptions, version } from './options'
import { NexeTarget } from './target'
import download = require('download')
import { getLatestGitRelease } from './releases'
import { IncomingMessage } from 'http'
import combineStreams = require('multistream')
import { Bundle, toStream } from './fs/bundle'

const isBsd = Boolean(~process.platform.indexOf('bsd'))
const make = isWindows ? 'vcbuild.bat' : isBsd ? 'gmake' : 'make'
const configure = isWindows ? 'configure' : './configure'

export interface NexeFile {
  filename: string
  absPath: string
  contents: string
}

export { NexeOptions }

export class NexeCompiler {
  /**
   * Epoch of when compilation started
   */
  private start = Date.now()
  /**
   * Copy of process.env
   */
  private env = { ...process.env }
  /**
   * Virtual FileSystem
   */
  private bundle: Bundle

  private compileStep: LogStep | undefined
  public log = new Logger(this.options.loglevel)
  /**
   * Root directory for the source of the current build
   */
  public src: string
  /**
   * In memory files that are being manipulated by the compiler
   */
  public files: NexeFile[] = []
  /**
   * Standalone pieces of code run before the application entrypoint
   */
  public shims: string[] = []
  /**
   * The last shim (defaults to "require('module').runMain()")
   */
  public startup: string = ''
  /**
   * The main entrypoint filename for your application - eg. node mainFile.js
   */
  public entrypoint: string | undefined
  /**
   * Not used
   */
  public targets: NexeTarget[]
  /**
   * Current target of the compiler
   */
  public target: NexeTarget
  /**
   * Output filename (-o myapp.exe)
   */
  public output = this.options.output
  /**
   * Path to the configure script
   */
  public configureScript: string
  /**
   * The file path of node binary
   */
  private nodeSrcBinPath: string

  constructor(public options: NexeOptions) {
    const { python } = (this.options = options)
    this.targets = options.targets as NexeTarget[]
    this.target = this.targets[0]
    this.src = join(this.options.temp, this.target.version)
    this.configureScript = configure + (semverGt(this.target.version, '10.10.0') ? '.py' : '')
    this.nodeSrcBinPath = isWindows
      ? join(this.src, 'Release', 'node.exe')
      : join(this.src, 'out', 'Release', 'node')
    this.log.step('nexe ' + version, 'info')
    this.bundle = new Bundle(options)
    if (isWindows) {
      const originalPath = process.env.PATH
      delete process.env.PATH
      this.env = { ...process.env }
      this.env.PATH = python
        ? (this.env.PATH = dequote(normalize(python)) + delimiter + originalPath)
        : originalPath
      process.env.PATH = originalPath
    } else {
      this.env = { ...process.env }
      python && (this.env.PYTHON = python)
    }
  }

  @bound
  addResource(file: string, content?: Buffer | string) {
    return this.bundle.addResource(file, content)
  }

  get binaryConfiguration() {
    return { resources: this.bundle.index }
  }

  get resourceSize() {
    return this.bundle.blobSize
  }

  @bound
  async readFileAsync(file: string) {
    this.assertBuild()
    let cachedFile = this.files.find(x => normalize(x.filename) === normalize(file))
    if (!cachedFile) {
      const absPath = join(this.src, file)
      cachedFile = {
        absPath,
        filename: file,
        contents: await readFileAsync(absPath, 'utf-8').catch(x => {
          if (x.code === 'ENOENT') return ''
          throw x
        })
      }
      this.files.push(cachedFile)
    }
    return cachedFile
  }

  @bound
  writeFileAsync(file: string, contents: string | Buffer) {
    this.assertBuild()
    return writeFileAsync(join(this.src, file), contents)
  }

  @bound
  async replaceInFileAsync(file: string, replace: string | RegExp, value: string) {
    const entry = await this.readFileAsync(file)
    entry.contents = entry.contents.replace(replace, value)
  }

  @bound
  async setFileContentsAsync(file: string, contents: string) {
    const entry = await this.readFileAsync(file)
    entry.contents = contents
  }

  quit() {
    const time = Date.now() - this.start
    this.log.write(`Finished in ${time / 1000}s`)
    return this.log.flush()
  }

  assertBuild() {
    if (!this.options.build) {
      throw new Error('This feature is only available with `--build`')
    }
  }

  public getNodeExecutableLocation(target?: NexeTarget) {
    if (target) {
      return join(this.options.temp, target.toString())
    }
    return this.nodeSrcBinPath
  }

  private _runBuildCommandAsync(command: string, args: string[]) {
    if (this.log.verbose) {
      this.compileStep!.pause()
    }
    return new Promise((resolve, reject) => {
      spawn(command, args, {
        cwd: this.src,
        env: this.env,
        stdio: this.log.verbose ? 'inherit' : 'ignore'
      })
        .once('error', (e: Error) => {
          if (this.log.verbose) {
            this.compileStep!.resume()
          }
          reject(e)
        })
        .once('close', (code: number) => {
          if (this.log.verbose) {
            this.compileStep!.resume()
          }
          if (code != 0) {
            const error = `${command} ${args.join(' ')} exited with code: ${code}`
            reject(new Error(error))
          }
          resolve()
        })
    })
  }

  private _configureAsync() {
    return this._runBuildCommandAsync(this.env.PYTHON || 'python', [
      this.configureScript,
      ...this.options.configure
    ])
  }

  private async _buildAsync() {
    this.compileStep!.log(
      `Configuring node build${
        this.options.configure.length ? ': ' + this.options.configure : '...'
      }`
    )
    await this._configureAsync()
    const buildOptions = this.options.make
    this.compileStep!.log(
      `Compiling Node${buildOptions.length ? ' with arguments: ' + buildOptions : '...'}`
    )
    await this._runBuildCommandAsync(make, buildOptions)
    return createReadStream(this.getNodeExecutableLocation())
  }

  private async _fetchPrebuiltBinaryAsync(target: NexeTarget) {
    let downloadOptions = this.options.downloadOptions

    if (this.options.ghToken) {
      downloadOptions = Object.assign({}, downloadOptions)
      downloadOptions.headers = Object.assign({}, downloadOptions.headers, {
        Authorization: 'token ' + this.options.ghToken
      })
    }

    const githubRelease = await getLatestGitRelease(downloadOptions)
    const assetName = target.toString()
    const asset = githubRelease.assets.find(x => x.name === assetName)

    if (!asset) {
      throw new Error(`${assetName} not available, create it using the --build flag`)
    }
    const filename = this.getNodeExecutableLocation(target)

    await download(asset.browser_download_url, dirname(filename), this.options.downloadOptions).on(
      'response',
      (res: IncomingMessage) => {
        const total = +res.headers['content-length']!
        let current = 0
        res.on('data', data => {
          current += data.length
          this.compileStep!.modify(`Downloading...${((current / total) * 100).toFixed()}%`)
        })
      }
    )
    return createReadStream(filename)
  }

  async compileAsync(target: NexeTarget) {
    const step = (this.compileStep = this.log.step('Compiling result'))
    const build = this.options.build
    const location = this.getNodeExecutableLocation(build ? undefined : target)
    let binary = (await pathExistsAsync(location)) ? createReadStream(location) : null
    if (!build && !binary) {
      step.modify('Fetching prebuilt binary')
      binary = await this._fetchPrebuiltBinaryAsync(target)
    }
    if (!binary) {
      binary = await this._buildAsync()
      step.log('Node binary compiled')
    }
    return this._assembleDeliverable(binary)
  }

  code() {
    return [this.shims.join(''), this.startup].join(';')
  }

  private _assembleDeliverable(binary: NodeJS.ReadableStream) {
    if (!this.options.mangle) {
      return binary
    }

    const startup = this.code(),
      codeSize = Buffer.byteLength(startup)

    const lengths = Buffer.from(Array(16))
    lengths.writeDoubleLE(codeSize, 0)
    lengths.writeDoubleLE(this.bundle.blobSize, 8)
    return combineStreams([
      binary,
      toStream(startup),
      this.bundle.toStream(),
      toStream(Buffer.concat([Buffer.from('<nexe~~sentinel>'), lengths]))
    ])
  }
}
