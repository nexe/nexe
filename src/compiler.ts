import { dirname, normalize, join } from 'path'
import { Buffer } from 'buffer'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { spawn } from 'child_process'
import { Logger } from './logger'
import { readFileAsync, writeFileAsync, pathExistsAsync, dequote, isWindows } from './util'
import { NexeOptions, nexeVersion } from './options'
import { NexeTarget } from './target'
import download = require('download')
import { getLatestGitRelease } from './releases'
import { IncomingMessage } from 'http'

const isBsd = Boolean(~process.platform.indexOf('bsd'))
const make = isWindows ? 'vcbuild.bat' : isBsd ? 'gmake' : 'make'
const configure = isWindows ? 'configure' : './configure'

export interface NexeFile {
  filename: string
  absPath: string
  contents: string
}

interface NexeHeader {
  resources: { [key: string]: number[] }
  version: string
}

export class NexeCompiler {
  private start = Date.now()
  private env = { ...process.env }
  private compileStep: { modify: Function; log: Function }
  public log = new Logger(this.options.loglevel)
  public src: string
  public files: NexeFile[] = []
  public input: string
  public bundledInput?: string
  public output: string | null
  public targets: NexeTarget[]
  public target: NexeTarget
  public resources: { bundle: string; index: { [key: string]: number[] } } = {
    index: {},
    bundle: ''
  }
  public readFileAsync: (file: string) => Promise<NexeFile>
  public writeFileAsync: (file: string, contents: Buffer | string) => Promise<void>
  public replaceInFileAsync: (file: string, replacer: any, replaceValue: string) => Promise<void>
  public setFileContentsAsync: (file: string, contents: string | Buffer) => Promise<void>
  private nodeSrcBinPath: string

  constructor(public options: NexeOptions) {
    const { python } = (this.options = options)
    this.targets = options.targets as NexeTarget[]
    this.target = this.targets[0]
    this.src = join(this.options.temp, this.target.version)
    this.nodeSrcBinPath = isWindows
      ? join(this.src, 'Release', 'node.exe')
      : join(this.src, 'out', 'Release', 'node')
    this.log.step('nexe ' + nexeVersion, 'info')
    if (python) {
      if (isWindows) {
        this.env.PATH = '"' + dequote(normalize(python)) + '";' + this.env.PATH
      } else {
        this.env.PYTHON = python
      }
    }

    this.readFileAsync = async (file: string) => {
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
    this.writeFileAsync = (file, contents) => writeFileAsync(join(this.src, file), contents)
    this.replaceInFileAsync = async (file, replace: string | RegExp, value: string) => {
      const entry = await this.readFileAsync(file)
      entry.contents = entry.contents.replace(replace, value)
    }
    this.setFileContentsAsync = async (file: string, contents: string) => {
      const entry = await this.readFileAsync(file)
      entry.contents = contents
    }
  }

  quit() {
    const time = Date.now() - this.start
    this.log.write(`Finsihed in ${time / 1000}s`)
    return this.log.flush()
  }

  public getNodeExecutableLocation(target?: NexeTarget) {
    if (target) {
      return join(this.options.temp, target.toString())
    }
    return this.nodeSrcBinPath
  }

  private _runBuildCommandAsync(command: string, args: string[]) {
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

  private _configureAsync() {
    return this._runBuildCommandAsync(this.env.PYTHON || 'python', [
      configure,
      ...this.options.configure
    ])
  }

  private async _buildAsync() {
    this.compileStep.log(
      `Configuring node build${this.options.configure.length
        ? ': ' + this.options.configure
        : '...'}`
    )
    await this._configureAsync()
    const buildOptions = this.options.make
    this.compileStep.log(
      `Compiling Node${buildOptions.length ? ' with arguments: ' + buildOptions : '...'}`
    )
    await this._runBuildCommandAsync(make, buildOptions)
    return createReadStream(this.getNodeExecutableLocation())
  }

  private async _fetchPrebuiltBinaryAsync(target: NexeTarget) {
    const downloadOptions: any = {
      headers: {
        'User-Agent': 'nexe (https://www.npmjs.com/package/nexe)'
      }
    }
    const githubRelease = await getLatestGitRelease(downloadOptions)
    const assetName = target.toString()
    const asset = githubRelease.assets.find(x => x.name === assetName)

    if (!asset) {
      throw new Error(`${assetName} not available, create it using the --build flag`)
    }
    const filename = this.getNodeExecutableLocation(target)
    await download(
      asset.browser_download_url,
      dirname(filename),
      downloadOptions
    ).on('response', (res: IncomingMessage) => {
      const total = +res.headers['content-length']!
      let current = 0
      res.on('data', data => {
        current += data.length
        this.compileStep.modify(`Downloading...${(current / total * 100).toFixed()}%`)
      })
    })
    return createReadStream(filename)
  }

  private _generateHeader() {
    const version =
      ['configure', 'vcBuild', 'make'].reduce((a, c) => {
        return (a += (this.options as any)[c]
          .slice()
          .sort()
          .join())
      }, '') + this.options.enableNodeCli
    const header = {
      resources: this.resources.index,
      version: createHash('md5')
        .update(version)
        .digest('hex')
    }
    const serializedHeader = this._serializeHeader(header)
    return header
  }

  private _serializeHeader(header: NexeHeader) {
    return `process.__nexe=${JSON.stringify(header)};`
  }

  async compileAsync(target: NexeTarget) {
    const step = (this.compileStep = this.log.step('Compiling result'))
    const build = this.options.build
    const location = this.getNodeExecutableLocation(build ? undefined : target)
    let binary = (await pathExistsAsync(location)) ? createReadStream(location) : null
    const header = this._generateHeader()
    if (!build && !binary) {
      step.modify('Fetching prebuilt binary')
      binary = await this._fetchPrebuiltBinaryAsync(target)
    }
    if (!binary) {
      binary = await this._buildAsync()
      step.log('Node binary compiled')
    }
    return this._assembleDeliverable(header, binary)
  }

  private _assembleDeliverable(header: NexeHeader, binary: NodeJS.ReadableStream) {
    if (this.options.empty) {
      return binary
    }
    const artifact = new Readable({ read() {} })
    binary.on('data', (chunk: Buffer) => {
      artifact.push(chunk)
    })
    binary.on('close', () => {
      const content = this._serializeHeader(header) + this.input
      artifact.push(content)
      artifact.push(this.resources.bundle)
      const lengths = Buffer.from(Array(16))
      lengths.writeDoubleLE(Buffer.byteLength(content), 0)
      lengths.writeDoubleLE(Buffer.byteLength(this.resources.bundle), 8)
      artifact.push(Buffer.concat([Buffer.from('<nexe~~sentinel>'), lengths]))
      artifact.push(null)
    })
    return artifact
  }
}
