import { delimiter, resolve, normalize, join } from 'path'
import { Buffer } from 'buffer'
import { createReadStream, ReadStream } from 'fs'
import { spawn } from 'child_process'
import { Logger, LogStep } from './logger'
import {
  readFileAsync,
  writeFileAsync,
  pathExistsAsync,
  statAsync,
  dequote,
  isWindows,
  bound,
  semverGt,
  wrap,
} from './util'
import { NexeOptions, version } from './options'
import { NexeTarget } from './target'
import MultiStream = require('multistream')
import { Bundle, toStream } from './fs/bundle'
import { File } from 'resolve-dependencies'

const isBsd = Boolean(~process.platform.indexOf('bsd'))
const make = isWindows ? 'vcbuild.bat' : isBsd ? 'gmake' : 'make'
const configure = isWindows ? 'configure' : './configure'

type StringReplacer = (match: string) => string

export interface NexeFile {
  filename: string
  absPath: string
  contents: string | Buffer
}

export { NexeOptions }

export class NexeError extends Error {
  constructor(m: string) {
    super(m)
    Object.setPrototypeOf(this, NexeError.prototype)
  }
}

export class NexeCompiler {
  /**
   * Epoch of when compilation started
   */
  private start = Date.now()
  private compileStep: LogStep | undefined
  public log = new Logger(this.options.loglevel)
  /**
   * Copy of process.env
   */
  public env = { ...process.env }
  /**
   * Virtual FileSystem
   */
  public bundle: Bundle
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
   * Flag to indicate whether or notstdin was used for input
   */
  public stdinUsed = false
  /**
   * Path to the configure script
   */
  public configureScript: string
  /**
   * The file path of node binary
   */
  public nodeSrcBinPath: string
  /**
   * Remote asset path if available
   */
  public remoteAsset: string

  constructor(public options: NexeOptions) {
    const { python } = (this.options = options)
    //SOMEDAY iterate over multiple targets with `--outDir`
    this.targets = options.targets as NexeTarget[]
    this.target = this.targets[0]
    if (!/https?\:\/\//.test(options.remote)) {
      throw new NexeError(`Invalid remote URI scheme (must be http or https): ${options.remote}`)
    }
    this.remoteAsset = options.remote + this.target.toString()
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
  addResource(absoluteFileName: string, content?: Buffer | string | File) {
    return this.bundle.addResource(absoluteFileName, content)
  }

  @bound
  async readFileAsync(file: string) {
    this.assertBuild()
    let cachedFile = this.files.find((x) => normalize(x.filename) === normalize(file))
    if (!cachedFile) {
      const absPath = join(this.src, file)
      cachedFile = {
        absPath,
        filename: file,
        contents: await readFileAsync(absPath, 'utf-8').catch((x) => {
          if (x.code === 'ENOENT') return ''
          throw x
        }),
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
  async replaceInFileAsync(file: string, replace: string | RegExp, value: string | StringReplacer) {
    const entry = await this.readFileAsync(file)
    entry.contents = entry.contents.toString().replace(replace, value as any)
  }

  @bound
  async setFileContentsAsync(file: string, contents: string | Buffer) {
    const entry = await this.readFileAsync(file)
    entry.contents = contents
  }

  quit(error?: any) {
    const time = Date.now() - this.start
    this.log.write(`Finished in ${time / 1000}s`, error ? 'red' : 'green')
    return this.log.flush()
  }

  assertBuild() {
    if (!this.options.build) {
      throw new NexeError('This feature is only available with `--build`')
    }
  }

  public getNodeExecutableLocation(target?: NexeTarget) {
    if (this.options.asset) {
      return resolve(this.options.cwd, this.options.asset)
    }
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
        stdio: this.log.verbose ? 'inherit' : 'ignore',
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
            reject(new NexeError(error))
          }
          resolve()
        })
    })
  }

  private _configureAsync() {
    if (isWindows && semverGt(this.target.version, '10.15.99')) {
      return Promise.resolve()
    }
    return this._runBuildCommandAsync(this.env.PYTHON || 'python', [
      this.configureScript,
      ...this.options.configure,
    ])
  }

  public async build(): Promise<ReadStream> {
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

  private async _shouldCompileBinaryAsync(binary: NodeJS.ReadableStream | null, location: string) {
    //SOMEDAY combine make/configure/vcBuild/and modified times of included files
    const { snapshot, build } = this.options

    if (!binary) {
      return true
    }

    if (build && snapshot != null && (await pathExistsAsync(snapshot))) {
      const snapshotLastModified = (await statAsync(snapshot)).mtimeMs
      const binaryLastModified = (await statAsync(location)).mtimeMs
      return snapshotLastModified > binaryLastModified
    }

    return false
  }

  async compileAsync(target: NexeTarget) {
    const step = (this.compileStep = this.log.step('Compiling result'))
    const build = this.options.build
    const location = this.getNodeExecutableLocation(build ? undefined : target)
    let binary = (await pathExistsAsync(location)) ? createReadStream(location) : null

    if (await this._shouldCompileBinaryAsync(binary, location)) {
      binary = await this.build()
      step.log('Node binary compiled')
    }
    return this._assembleDeliverable(binary!)
  }

  code() {
    return [this.shims.join(''), this.startup].join(';')
  }

  private async _assembleDeliverable(binary: NodeJS.ReadableStream) {
    if (!this.options.mangle) {
      return binary
    }
    const resources = this.bundle.renderIndex()
    this.shims.unshift(wrap(`process.__nexe = ${JSON.stringify({ resources })};\n`))

    const code = this.code(),
      codeSize = Buffer.byteLength(code),
      lengths = Buffer.from(Array(16))

    lengths.writeDoubleLE(codeSize, 0)
    lengths.writeDoubleLE(this.bundle.size, 8)
    return new (MultiStream as any)([
      binary,
      toStream(code),
      this.bundle.toStream(),
      toStream(Buffer.concat([Buffer.from('<nexe~~sentinel>'), lengths])),
    ])
  }
}
