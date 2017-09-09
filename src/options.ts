import * as parseArgv from 'minimist'
import { NexeCompiler } from './compiler'
import { isWindows, padRight } from './util'
import { basename, extname, join, isAbsolute, relative } from 'path'
import { getTarget, NexeTarget } from './target'
import { EOL } from 'os'
import * as c from 'chalk'

export const nexeVersion = '2.0.0-rc.5'

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
  empty: boolean
  sourceUrl?: string
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
  patches: []
}
const alias = {
  i: 'input',
  o: 'output',
  t: 'target',
  n: 'name',
  r: 'resource',
  a: 'resource',
  p: 'python',
  f: 'flag',
  c: 'configure',
  m: 'make',
  h: 'help',
  l: 'loglevel',
  'fake-argv': 'fakeArgv'
}
const argv = parseArgv(process.argv, { alias, default: defaults })
const g = c.gray
let help = `
${c.bold('nexe <input> [options]')}

   ${c.underline.bold('Options:')}

  -i   --input        ${g('=index.js')}       -- application entry point
  -o   --output       ${g('=my-app.exe')}     -- path to output file
  -t   --target       ${g('=8.4.0-x64')}      -- node version description
  -n   --name         ${g('=my-app')}         -- main app module name

  -r   --resource                     -- *embed files (glob) within the binary

   ${c.underline.bold('Building from source:')}

  -b   --build                        -- build from source
  -p   --python                       -- python2 (as python) executable path
  -f   --flag                         -- *v8 flags to include during compilation
  -c   --configure                    -- *arguments to the configure step
  -m   --make                         -- *arguments to the make/build step
       --snapshot                     -- path to a warmup snapshot
       --ico                          -- file name for alternate icon file (windows)
       --rc-*                         -- populate rc file options (windows)
       --sourceUrl                    -- pass an alternate source (node.tar.gz) url
       --enableNodeCli                -- enable node cli enforcement (blocks app cli)

   ${c.underline.bold('Other options:')}

       --bundle                       -- custom bundling module with 'createBundle' export
       --temp                         -- temp file storage default './nexe'
       --cwd                          -- set the current working directory for the command
       --fake-argv       TODO         -- fake argv[1] with entry file
       --clean                        -- force download of sources
       --silent                       -- disable logging
       --verbose                      -- set logging to verbose

       -* variable key name           * option can be used more than once`.trim()
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
  options.flags = flatten(opts.flag, options.flags)
  options.targets = flatten(opts.target, options.targets).map(getTarget)
  options.make = flatten(options.vcBuild, options.make)
  options.configure = flatten(options.configure)
  options.resources = flatten(opts.resource, options.resources)
  options.rc = options.rc || extractCliMap(/^rc-.*/, options)

  if (!options.targets.length) {
    options.targets.push(getTarget())
  }

  if (options.build) {
    const { arch } = options.targets[0] as NexeTarget
    if (isWindows) {
      options.make = Array.from(new Set(options.make.concat(arch)))
    } else {
      options.configure = Array.from(new Set(options.configure.concat([`--dest-cpu=${arch}`])))
    }
  }

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
