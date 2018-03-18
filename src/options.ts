import * as parseArgv from 'minimist'
import { NexeCompiler } from './compiler'
import { isWindows, padRight } from './util'
import { basename, extname, join, isAbsolute, relative, dirname, resolve } from 'path'
import { getTarget, NexeTarget } from './target'
import { EOL, homedir } from 'os'
import chalk from 'chalk'
import { resolveFileName } from 'resolve-dependencies'
const caw = require('caw')
const c = process.platform === 'win32' ? chalk.constructor({ enabled: false }) : chalk

export const version = '{{replace:0}}'

export interface NexePatch {
  (compiler: NexeCompiler, next: () => Promise<void>): Promise<void>
}

export interface NexeOptions {
  build: boolean
  input: string
  output: string
  targets: (string | NexeTarget)[]
  name: string
  cwd: string
  flags: string[]
  configure: string[]
  vcBuild: string[]
  make: string[]
  snapshot?: string
  resources: string[]
  temp: string
  rc: { [key: string]: string }
  enableNodeCli: boolean
  bundle: boolean | string
  patches: (string | NexePatch)[]
  plugins: (string | NexePatch)[]
  native: any
  empty: boolean
  ghToken: string
  sourceUrl?: string
  enableStdIn?: boolean
  python?: string
  loglevel: 'info' | 'silent' | 'verbose'
  silent?: boolean
  fakeArgv?: boolean
  verbose?: boolean
  info?: boolean
  ico?: string
  debugBundle?: boolean
  warmup?: string
  compress?: boolean
  clean?: boolean
  /**
   * Api Only
   */
  downloadOptions: any
}

const defaults = {
  flags: [],
  cwd: process.cwd(),
  configure: [],
  make: [],
  targets: [],
  vcBuild: isWindows ? ['nosign', 'release'] : [],
  enableNodeCli: false,
  compress: false,
  build: false,
  bundle: true,
  patches: [],
  plugins: []
}
const alias = {
  i: 'input',
  o: 'output',
  v: 'version',
  t: 'target',
  b: 'build',
  n: 'name',
  r: 'resource',
  a: 'resource',
  p: 'python',
  f: 'flag',
  c: 'configure',
  m: 'make',
  h: 'help',
  l: 'loglevel',
  'fake-argv': 'fakeArgv',
  'gh-token': 'ghToken'
}
const argv = parseArgv(process.argv, { alias, default: { ...defaults, enableStdIn: true } })
const g = c.gray
let help = `
${c.bold('nexe <entry-file> [options]')}

   ${c.underline.bold('Options:')}

  -i   --input                      -- application entry point
  -o   --output                     -- path to output file
  -t   --target                     -- node version description
  -n   --name                       -- main app module name
  -r   --resource                   -- *embed files (glob) within the binary
       --plugin                     -- extend nexe runtime behavior

   ${c.underline.bold('Building from source:')}

  -b   --build                      -- build from source
  -p   --python                     -- python2 (as python) executable path
  -f   --flag                       -- *v8 flags to include during compilation
  -c   --configure                  -- *arguments to the configure step
  -m   --make                       -- *arguments to the make/build step
       --snapshot                   -- path to a warmup snapshot
       --ico                        -- file name for alternate icon file (windows)
       --rc-*                       -- populate rc file options (windows)
       --sourceUrl                  -- pass an alternate source (node.tar.gz) url
       --enableNodeCli              -- enable node cli enforcement (blocks app cli)

   ${c.underline.bold('Other options:')}

       --bundle                     -- custom bundling module with 'createBundle' export
       --temp                       -- temp file storage default '~/.nexe'
       --cwd                        -- set the current working directory for the command
       --fake-argv                  -- fake argv[1] with entry file
       --clean                      -- force download of sources
       --silent                     -- disable logging
       --verbose                    -- set logging to verbose

       -* variable key name         * option can be used more than once`.trim()
help = EOL + help + EOL

function flatten(...args: any[]): string[] {
  return ([] as string[]).concat(...args).filter(x => x)
}

/**
 * Extract keys such as { "rc-CompanyName": "Node.js" } to
 * { CompanyName: "Node.js" }
 * @param {*} match
 * @param {*} options
 */
function extractCliMap(match: RegExp, options: any) {
  return Object.keys(options)
    .filter(x => match.test(x))
    .reduce(
      (map: any, option: any) => {
        const key = option.split('-')[1]
        map[key] = options[option]
        delete options[option]
        return map
      },
      {} as any
    )
}

function extractLogLevel(options: NexeOptions) {
  if (options.loglevel) return options.loglevel
  if (options.silent) return 'silent'
  if (options.verbose) return 'verbose'
  return 'info'
}

function isName(name: string) {
  return name && name !== 'index'
}

function extractName(options: NexeOptions) {
  let name = options.name
  //try and use the input filename as the output filename if its not index
  if (!isName(name) && typeof options.input === 'string') {
    name = basename(options.input).replace(extname(options.input), '')
  }
  //try and use the directory as the filename
  if (!isName(name) && basename(options.cwd)) {
    name = basename(options.cwd)
  }

  return name.replace(/\.exe$/, '')
}

function isEntryFile(filename?: string): filename is string {
  return Boolean(filename && !isAbsolute(filename))
}

export function resolveEntry(input: string, cwd: string, maybeEntry?: string) {
  let result = null
  if (input) {
    result = resolveFileName(cwd, input, { silent: true })
  }
  if (isEntryFile(maybeEntry)) {
    result = resolveFileName(cwd, maybeEntry, { silent: true })
  }
  if (!process.stdin.isTTY) {
    return ''
  }

  if (!result || !result.absPath) {
    result = resolveFileName(cwd, '.', { silent: true })
  }

  if (!result.absPath) throw new Error(`Entry file "${input}" not found!`)

  return result.absPath
}

function normalizeOptions(input?: Partial<NexeOptions>): NexeOptions {
  const options = Object.assign({}, defaults, input) as NexeOptions
  const opts = options as any
  const cwd = (options.cwd = resolve(options.cwd))
  options.temp = options.temp
    ? resolve(cwd, options.temp)
    : process.env.NEXE_TEMP || join(homedir(), '.nexe')
  const maybeEntry = input === argv ? argv._[argv._.length - 1] : undefined
  options.input = resolveEntry(options.input, cwd, maybeEntry)
  options.name = extractName(options)
  options.loglevel = extractLogLevel(options)
  options.flags = flatten(opts.flag, options.flags)
  options.targets = flatten(opts.target, options.targets).map(getTarget)
  if (!options.targets.length) {
    options.targets.push(getTarget())
  }
  options.ghToken = options.ghToken || process.env.GITHUB_TOKEN || ''
  options.make = flatten(options.vcBuild, options.make)
  options.configure = flatten(options.configure)
  options.resources = flatten(opts.resource, options.resources)

  options.downloadOptions = options.downloadOptions || {}
  options.downloadOptions.headers = options.downloadOptions.headers || {}
  options.downloadOptions.headers['User-Agent'] = 'nexe (https://www.npmjs.com/package/nexe)'
  options.downloadOptions.agent = process.env.HTTPS_PROXY
    ? caw(process.env.HTTPS_PROXY, { protocol: 'https' })
    : options.downloadOptions.agent || require('https').globalAgent
  options.downloadOptions.rejectUnauthorized = process.env.HTTPS_PROXY ? false : true

  options.rc = options.rc || extractCliMap(/^rc-.*/, options)
  options.output =
    (options.targets[0] as NexeTarget).platform === 'windows'
      ? `${(options.output || options.name).replace(/\.exe$/, '')}.exe`
      : `${options.output || options.name}`
  options.output = resolve(cwd, options.output)

  if (options.build) {
    const { arch } = options.targets[0] as NexeTarget
    if (isWindows) {
      options.make = Array.from(new Set(options.make.concat(arch)))
    } else {
      options.configure = Array.from(new Set(options.configure.concat([`--dest-cpu=${arch}`])))
    }
  }

  const requireDefault = (x: string) => {
    if (typeof x === 'string') {
      return require(x).default
    }
    return x
  }

  options.plugins = flatten(opts.plugin, options.plugins).map(requireDefault)
  options.patches = flatten(opts.patch, options.patches).map(requireDefault)

  Object.keys(alias)
    .filter(k => k !== 'rc')
    .forEach(x => delete opts[x])

  return options
}

export { argv, normalizeOptions, help }
