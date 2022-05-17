import { basename, extname, join, isAbsolute, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EOL, homedir } from 'node:os'
import { globalAgent } from 'node:https'
import { createRequire } from 'node:module'

const dir = typeof __dirname === 'string' ? __dirname : dirname(fileURLToPath(import.meta.url)),
  cjs = createRequire(dir)

import { resolveSync } from 'resolve-dependencies'
import parseArgv from 'minimist'

import caw from 'caw'

import { NexeCompiler, NexeError } from './compiler'
import { getTarget, NexeTarget } from './target'
import { isWindows, STDIN_FLAG, esm } from './util'

export const version = '{{replace:0}}'

export type NexePatch = (compiler: NexeCompiler, next: () => Promise<void>) => Promise<void>

export interface NexeOptions {
  build: boolean
  input: string
  output: string
  targets: Array<string | NexeTarget>
  name: string
  remote: string
  asset: string
  cwd: string
  fs: boolean | string[]
  flags: string[]
  configure: string[]
  vcBuild: string[]
  make: string[]
  resources: string[]
  temp: string
  enableNodeCli: boolean
  bundle: boolean | string
  patches: Array<string | NexePatch>
  plugins: Array<string | NexePatch>
  native: any
  mangle: boolean
  ghToken: string
  sourceUrl?: string
  enableStdIn?: boolean
  python?: string
  loglevel: 'info' | 'silent' | 'verbose'
  silent?: boolean
  fakeArgv?: boolean
  verbose?: boolean
  info?: boolean
  debugBundle?: boolean
  warmup?: string
  clean?: boolean
  /**
   * Api Only
   */
  downloadOptions: any
}

const defaults = {
    flags: [],
    cwd: process.cwd(),
    fs: true,
    configure: [],
    mangle: true,
    make: [],
    targets: [],
    vcBuild: isWindows ? ['nosign', 'release'] : [],
    enableNodeCli: false,
    build: false,
    bundle: true,
    patches: [],
    plugins: [],
    remote: 'https://github.com/nexe/nexe/releases/download/v3.3.3/',
  },
  alias = {
    i: 'input',
    o: 'output',
    v: 'version',
    a: 'asset',
    t: 'target',
    b: 'build',
    n: 'name',
    r: 'resource',
    p: 'python',
    f: 'flag',
    c: 'configure',
    m: 'make',
    h: 'help',
    l: 'loglevel',
    'fake-argv': 'fakeArgv',
    'gh-token': 'ghToken',
  },
  argv = parseArgv(process.argv, { alias, default: { ...defaults } }),
  help = () => {
    const c = esm.chalk?.default as typeof import('chalk').default
    return (
      EOL +
      `
${c.bold('nexe <entry-file> [options]')}

   ${c.underline.bold('Options:')}

  -i   --input                      -- application entry point
  -o   --output                     -- path to output file
  -t   --target                     --  * node version description
  -n   --name                       -- main app module name
  -r   --resource                   --  * embed additional files (glob) within the binary
       --remote                     -- alternate root directory for pre-built base (nexe) binaries from
       --plugin                     -- extend nexe runtime behavior

   ${c.underline.bold('Building from source:')}

  -b   --build                      -- build from source
  -p   --python                     -- python3 executable path
  -f   --flag                       --  * v8 flags to include during compilation
  -c   --configure                  --  * arguments to the configure step
  -m   --make                       --  * arguments to the make/build step
       --patch                      --  * extend patches applied to source
       --no-mangle                  -- used when generating base binaries, or when patching _third_party_main manually
       --sourceUrl                  -- pass an alternate source tarball (node.tar.gz) url
       --enableNodeCli              -- enable node cli enforcement (blocks app cli)

   ${c.underline.bold('Other options:')}

       --bundle                     -- custom bundling module with 'createBundle' export
       --temp                       -- temp file storage default '~/.nexe'
       --cwd                        -- set the current working directory for the command
       --fake-argv                  -- fake argv[1] with entry file
       --clean                      -- force download of sources
       --silent                     -- disable logging
       --verbose                    -- set logging to verbose

  "*" indicates an option can be used more than once`.trim() +
      EOL
    )
  }

function flatten(...args: any[]): string[] {
  return ([] as string[]).concat(...args).filter((x) => x)
}

function extractLogLevel(options: NexeOptions) {
  if (options.loglevel) return options.loglevel
  if (options.silent) return 'silent'
  if (options.verbose) return 'verbose'
  return 'info'
}

function isName(name: string) {
  return name && name !== 'index' && name !== STDIN_FLAG
}

function extractName(options: NexeOptions) {
  let name = options.name
  // try and use the input filename as the output filename if its not index
  if (!isName(name) && typeof options.input === 'string') {
    name = basename(options.input).replace(extname(options.input), '')
  }
  // try and use the directory as the filename
  if (!isName(name) && basename(options.cwd)) {
    name = basename(options.cwd)
  }

  return name.replace(/\.exe$/, '')
}

function padRelative(input: string) {
  let prefix = ''
  if (!input.startsWith('.')) {
    prefix = './'
  }
  return prefix + input
}

function isEntryFile(filename?: string): filename is string {
  return Boolean(filename && !isAbsolute(filename))
}

export function resolveEntry(
  input: string,
  cwd: string,
  maybeEntry: string | undefined,
  bundle: boolean | string
) {
  let result = null
  if (input === '-' || maybeEntry === '-') {
    return STDIN_FLAG
  }
  if (input && isAbsolute(input)) {
    return input
  }
  if (input) {
    const inputPath = padRelative(input)
    result = resolveSync(cwd, inputPath)
  }
  if (isEntryFile(maybeEntry) && (result == null || !result.absPath)) {
    const inputPath = padRelative(maybeEntry)
    result = resolveSync(cwd, inputPath)
  }
  if (!process.stdin.isTTY && (result == null || !result.absPath) && bundle === defaults.bundle) {
    return STDIN_FLAG
  }
  if (result == null || !result.absPath) {
    result = resolveSync(cwd, '.')
  }
  if (!result.absPath) {
    throw new NexeError(`Entry file "${input || ''}" not found!`)
  }
  return result.absPath
}

function isCli(options?: Partial<NexeOptions>) {
  return argv === options
}

function normalizeOptions(input?: Partial<NexeOptions>): NexeOptions {
  const options = Object.assign({}, defaults, input) as NexeOptions,
    opts = options as any,
    cwd = (options.cwd = resolve(options.cwd))
  options.temp = options.temp
    ? resolve(cwd, options.temp)
    : process.env.NEXE_TEMP || join(homedir(), '.nexe')
  const maybeEntry = isCli(input) ? argv._[argv._.length - 1] : undefined
  options.input = resolveEntry(options.input, cwd, maybeEntry, options.bundle)
  options.enableStdIn = isCli(input) && options.input === STDIN_FLAG
  options.name = extractName(options)
  options.loglevel = extractLogLevel(options)
  options.flags = flatten(opts.flag, options.flags)
  options.targets = flatten(opts.target, options.targets).map(getTarget)
  if (options.targets.length === 0) {
    options.targets.push(getTarget())
  }
  options.ghToken = options.ghToken || process.env.GITHUB_TOKEN || ''
  options.make = flatten(isWindows ? options.vcBuild : options.make)
  options.configure = flatten(options.configure)
  options.resources = flatten(opts.resource, options.resources)

  if (!options.remote.endsWith('/')) {
    options.remote += '/'
  }

  options.downloadOptions = options.downloadOptions || {}
  options.downloadOptions.headers = options.downloadOptions.headers || {}
  options.downloadOptions.headers['User-Agent'] = 'nexe (https://www.npmjs.com/package/nexe)'
  options.downloadOptions.agent = process.env.HTTPS_PROXY
    ? caw(process.env.HTTPS_PROXY, { protocol: 'https' })
    : options.downloadOptions.agent || globalAgent
  options.downloadOptions.rejectUnauthorized = !process.env.NODE_TLS_REJECT_UNAUTHORIZED

  options.output =
    (options.targets[0] as NexeTarget).platform === 'windows'
      ? `${(options.output || options.name).replace(/\.exe$/, '')}.exe`
      : `${options.output || options.name}`
  options.output = resolve(cwd, options.output)

  const requireDefault = (x: string) => {
    if (typeof x === 'string') {
      return cjs(x).default
    }
    return x
  }

  options.mangle = 'mangle' in opts ? opts.mangle : true
  options.plugins = flatten(opts.plugin, options.plugins).map(requireDefault)
  options.patches = flatten(opts.patch, options.patches).map(requireDefault)

  if ((!options.mangle && !options.bundle) || options.patches.length > 0) {
    options.build = true
  }

  if (options.build) {
    const { arch } = options.targets[0] as NexeTarget
    if (isWindows) {
      options.make = Array.from(new Set(options.make.concat(arch)))
    } else {
      options.configure = Array.from(new Set(options.configure.concat([`--dest-cpu=${arch}`])))
    }
  }

  Object.keys(alias)
    .filter((k) => k !== 'rc')
    .forEach((x) => delete opts[x])

  return options
}

export { argv, normalizeOptions, help }
