import * as parseArgv from 'minimist'
import { NexeCompiler } from './compiler'
import { isWindows, padRight } from './util'
import { basename, extname, join, isAbsolute, relative } from 'path'
import { getTarget, NexeTarget } from './target'
import { EOL } from 'os'
import * as chalk from 'chalk'

export const nexeVersion = '2.0.0-rc.4'

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
  version: string
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
  empty: boolean
  sourceUrl?: string
  python?: string
  loglevel: 'info' | 'silent' | 'verbose'
  silent?: boolean
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
  version: process.version.slice(1),
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
  patches: []
}
const alias = {
  i: 'input',
  o: 'output',
  t: 'target',
  n: 'name',
  v: 'version',
  r: 'resource',
  a: 'resource',
  p: 'python',
  f: 'flag',
  c: 'configure',
  m: 'make',
  s: 'snapshot',
  h: 'help',
  l: 'loglevel'
}
const argv = parseArgv(process.argv, { alias, default: defaults })
const g = chalk.gray
const help =
  `
nexe --help              CLI OPTIONS

  -i   --input      ${g('=index.js')}               -- application entry point
  -o   --output     ${g('=my-app.exe')}             -- path to output file
  -t   --target     ${g('=mac-x64-8.4.0')}          -- *target a prebuilt binary
  -n   --name       ${g('=my-app')}                 -- main app module name
  -v   --version    ${g(`=${padRight(process.version.slice(1), 23)}`)}-- node version
  -p   --python     ${g('=/path/to/python2')}       -- python executable
  -f   --flag       ${g('="--expose-gc"')}          -- *v8 flags to include during compilation
  -c   --configure  ${g('="--with-dtrace"')}        -- *pass arguments to the configure step
  -m   --make       ${g('="--loglevel"')}           -- *pass arguments to the make/build step
  -s   --snapshot   ${g('=/path/to/snapshot')}      -- build with warmup snapshot
  -r   --resource   ${g('=./paths/**/*')}           -- *embed file bytes within the binary
  -b   --build                              -- build from source
       --bundle     ${g('=./path/to/config')}       -- pass a module path that exports nexeBundle
       --temp       ${g('=./path/to/temp')}         -- default './nexe'
       --no-bundle                          -- set when input is already bundled
       --cwd                                -- set the current working directory for the command
       --ico                                -- file name for alternate icon file (windows)
       --rc-*                               -- populate rc file options (windows)
       --clean                              -- force download of sources
       --enableNodeCli                      -- enable node cli enforcement (blocks app cli)
       --sourceUrl                          -- pass an alternate source (node.tar.gz) url
       --silent                             -- disable logging
       --verbose                            -- set logging to verbose

       -* variable key name                 * option can be used more than once`.trim() + EOL

function flattenFilter(...args: any[]): string[] {
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
    .reduce((map: { [key: string]: string }, option: keyof NexeOptions) => {
      const key = option.split('-')[1]
      map[key] = options[option]
      delete options[option]
      return map
    }, {})
}

function tryResolveMainFileName(cwd: string) {
  let filename
  try {
    const file = require.resolve(cwd)
    filename = basename(file).replace(extname(file), '')
  } catch (_) {}

  return !filename || filename === 'index' ? 'nexe_' + Date.now() : filename
}

function extractLogLevel(options: NexeOptions) {
  if (options.loglevel) return options.loglevel
  if (options.silent) return 'silent'
  if (options.verbose) return 'verbose'
  return 'info'
}

function extractName(options: NexeOptions) {
  let name = options.name
  if (!name && typeof options.input === 'string') {
    name = basename(options.input).replace(extname(options.input), '')
  }
  name = name || tryResolveMainFileName(options.cwd)
  return name.replace(/\.exe$/, '')
}

function isEntryFile(filename: string) {
  return filename && !isAbsolute(filename) && filename !== 'node' && /\.(tsx?|jsx?)$/.test(filename)
}

function findInput(input: string, cwd: string) {
  const maybeInput = argv._.slice().pop() || ''
  if (input) {
    return input
  }
  if (isEntryFile(maybeInput)) {
    return maybeInput
  }
  if (!process.stdin.isTTY) {
    return ''
  }
  try {
    const main = require.resolve(cwd)
    return './' + relative(cwd, main)
  } catch (e) {
    void e
  }
  return ''
}

function normalizeOptionsAsync(input?: Partial<NexeOptions>): Promise<NexeOptions | never> {
  if (argv.help || argv._.some((x: string) => x === 'version') || argv.version === true) {
    return new Promise(() => {
      process.stderr.write(argv.help ? help : nexeVersion + EOL, () => process.exit(0))
    })
  }
  const options = Object.assign({}, defaults, input) as NexeOptions
  const opts = options as any

  options.temp = process.env.NEXE_TEMP || join(options.cwd, '.nexe')
  options.input = findInput(options.input, options.cwd)
  options.name = extractName(options)
  options.loglevel = extractLogLevel(options)
  options.flags = flattenFilter(opts.flag, options.flags)
  options.targets = flattenFilter(opts.target, options.targets).map(getTarget)
  options.make = flattenFilter(options.vcBuild, options.make)
  options.configure = flattenFilter(options.configure)
  options.resources = flattenFilter(opts.resource, options.resources)
  options.rc = options.rc || extractCliMap(/^rc-.*/, options)

  if (!options.targets.length) {
    options.targets = [getTarget(options.version)]
  }

  if (options.build) {
    const { arch } = options.targets[0] as NexeTarget
    if (isWindows) {
      options.make = Array.from(new Set(options.make.concat(arch)))
    } else {
      options.configure = Array.from(new Set(options.configure.concat([`--dest-cpu=${arch}`])))
    }
  }

  options.version = (options.targets[0] as NexeTarget).version

  options.patches = options.patches.map(x => {
    if (typeof x === 'string') {
      return require(x).default
    }
    return x
  })

  Object.keys(alias)
    .filter(k => k !== 'rc')
    .forEach(x => delete opts[x])

  return Promise.resolve(options)
}

export { argv, normalizeOptionsAsync }
