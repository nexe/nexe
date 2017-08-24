import * as parseArgv from 'minimist'
import { NexeCompiler } from './compiler'
import { basename, extname, join } from 'path'
import * as Bluebird from 'bluebird'
import { EOL } from 'os'

export interface NexePatch {
  (compiler: NexeCompiler, next: () => Promise<void>): Promise<void>
}

export interface NexeOptions {
  build: boolean
  /**
   * Entrypoint filepath
   */
  input: string
  output: string
  targets: string[]
  /**
   * Build name, Used for executable, and stacktraces
   */
  name: string
  /**
   * The node version to be built
   */
  version: string
  python?: string
  /**
   * Node flags e.g. "--expose-gc" baked into the executable
   */
  flags: string[]
  /**
   * Pass configuration options to node build configure script
   */
  configure: string[]
  /**
   * Pass make options to node make script
   */
  make: string[]
  vcBuild: string[]
  snapshot?: string
  /**
   * Array of glob strings describing resources to pull into the bundle
   */
  resources: string[]
  /**
   * Temporary directory where nexe artifacts will be cached
   * TODO dot folder in home dir
   */
  temp: string
  ico?: string
  rc: { [key: string]: string }
  /**
   * Causes nexe to remove all temporary files for current configuration
   */
  clean: boolean
  enableNodeCli: boolean
  sourceUrl?: string
  bundle: boolean | string
  loglevel: 'info' | 'silent' | 'verbose'
  silent?: boolean
  verbose?: boolean
  info?: boolean
  patches: NexePatch[]

  empty: boolean
  warmup?: string
  downloadOptions?: any
}

function padRight(str: string, l: number) {
  return (str + ' '.repeat(l)).substr(0, l)
}

const defaults = {
  temp: process.env.NEXE_TEMP || join(process.cwd(), '.nexe'),
  version: process.version.slice(1),
  flags: [],
  configure: [],
  make: [],
  targets: [],
  vcBuild: ['nosign', 'release', process.arch],
  enableNodeCli: false,
  bundle: true,
  build: true,
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
  vc: 'vcBuild',
  s: 'snapshot',
  cli: 'enableNodeCli',
  h: 'help',
  l: 'loglevel'
}
const argv = parseArgv(process.argv, { alias, default: defaults })
const help =
  `
nexe --help              CLI OPTIONS

  -b   --build                              -- build from source
  -i   --input      =index.js               -- application entry point
  -o   --output     =my-app.exe             -- path to output file
  -t   --target     =win32-x64-6.10.3       -- *target a prebuilt binary
  -n   --name       =my-app                 -- main app module name
  -v   --version    =${padRight(process.version.slice(1), 23)}-- node version
  -p   --python     =/path/to/python2       -- python executable
  -f   --flag       ="--expose-gc"          -- *v8 flags to include during compilation
  -c   --configure  ="--with-dtrace"        -- *pass arguments to the configure command
  -m   --make       ="--loglevel"           -- *pass arguments to the make command
  -vc  --vcBuild    =x64                    -- *pass arguments to vcbuild.bat
  -s   --snapshot   =/path/to/snapshot      -- build with warmup snapshot
  -r   --resource   =./paths/**/*           -- *embed file bytes within the binary
       --bundle     =./path/to/config       -- pass a module path that exports nexeBundle
       --temp       =./path/to/temp         -- nexe temp files (for downloads and source builds)
       --no-bundle                          -- set when input is already bundled
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

function tryResolveMainFileName() {
  let filename
  try {
    const file = require.resolve(process.cwd())
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
  if (typeof options.input === 'string' && !name) {
    name = basename(options.input).replace(extname(options.input), '')
  }
  name = name || tryResolveMainFileName()
  return name.replace(/\.exe$/, '')
}

function normalizeOptionsAsync(input: Partial<NexeOptions>) {
  if (argv.help || argv._.some((x: string) => x === 'version')) {
    process.stderr.write(argv.help ? help : '2.0.0-beta.7' + EOL, () => process.exit(0))
  }

  const options = Object.assign({}, defaults, input) as NexeOptions
  const opts = options as any
  delete opts._
  options.loglevel = extractLogLevel(options)
  options.name = extractName(options)
  options.flags = flattenFilter(opts.flag, options.flags)
  options.targets = flattenFilter(opts.target, options.targets)
  options.make = flattenFilter(options.make)
  options.vcBuild = flattenFilter(options.vcBuild)
  options.configure = flattenFilter(options.configure)
  options.resources = flattenFilter(opts.resource, options.resources)
  options.rc = options.rc || extractCliMap(/^rc-.*/, options)

  if (options.build) {
    options.targets = []
    options.build = true
  } else if (!options.targets.length) {
    const defaultTarget = [process.platform, process.arch, options.version].join('-')
    options.targets = [defaultTarget]
  }

  Object.keys(alias).filter(k => k !== 'rc').forEach(x => delete opts[x])

  return Promise.resolve(options)
}

export { argv, normalizeOptionsAsync }
