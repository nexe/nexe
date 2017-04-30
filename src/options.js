import parseArgv from 'minimist'
import { basename, extname, join } from 'path'
import Bluebird from 'bluebird'
import { resolveModule } from './util'
import { EOL } from 'os'

function padRight (str, l) {
  return (str + ' '.repeat(l)).substr(0, l)
}
const defaults = {
  temp: process.env.NEXE_TEMP || join(process.cwd(), '.nexe'),
  version: process.version.slice(1),
  flags: [],
  configure: [],
  make: [],
  vcBuild: ['nosign', 'release'],
  quick: false,
  bundle: true,
  enableNodeCli: false,
  verbose: false,
  silent: false,
  padding: 2,
  patches: []
}
const alias = {
  i: 'input',
  o: 'output',
  t: 'temp',
  n: 'name',
  v: 'version',
  p: 'python',
  f: 'flag',
  c: 'configure',
  m: 'make',
  vc: 'vcBuild',
  q: 'quick',
  s: 'snapshot',
  b: 'bundle',
  cli: 'enableNodeCli',
  h: 'help',
  l: 'loglevel'
}
const argv = parseArgv(process.argv, { alias, default: defaults })
const help = `
nexe --help              CLI OPTIONS

  -i   --input      =./index.js             -- application entry point
  -o   --output     =./nexe.exe             -- path to output file
  -t   --temp       =./.nexe                -- nexe temp directory (3Gb+) ~ NEXE_TEMP
  -n   --name       =nexe.js                -- file name for error reporting at run time
  -v   --version    =${padRight(process.version.slice(1), 23)}-- node version
  -p   --python     =/path/to/python2       -- python executable
  -f   --flag       ="--expose-gc"          -- *v8 flags to include during compilation
  -c   --configure  ="--with-dtrace"        -- *pass arguments to the configure command
  -m   --make       ="--loglevel"           -- *pass arguments to the make command
  -vc  --vcBuild    =x64                    -- *pass arguments to vcbuild.bat
  -s   --snapshot   =/path/to/snapshot      -- build with warmup snapshot
  -b   --bundle                             -- attempt bundling application
       --ico                                -- file name for alternate icon file (windows)
       --rc-*                               -- populate rc file options (windows)
       --clean                              -- force download of sources
       --enableNodeCli                      -- enable node cli enforcement (blocks app cli)
       --sourceUrl                          -- pass an alternate source (node.tar.gz) url
       --silent                             -- disable logging
       --verbose                            -- set logging to verbose


       -* variable key name                 * option can be used more than once

  TODO -q   --quick   =win32-x64-X.X.X        -- use prebuilt binary (url, key or path)
  TODO     --resource-* =/path/to/resource      -- *embed file bytes within the binary
`.trim()

function flattenFilter (...args) {
  return [].concat(...args).filter(x => x)
}

/**
 * Extract keys such as { "rc-CompanyName": "Node.js" } to
 * { CompanyName: "Node.js" }
 * @param {*} match
 * @param {*} options
 */
function extractCliMap (match, options) {
  return Object.keys(options).filter(x => match.test(x))
    .reduce((map, option) => {
      const key = option.split('-')[1]
      map = map || {}
      map[key] = options[option]
      delete options[option]
      return map
    }, null) || {}
}

function tryResolveMainFileName () {
  let filename = 'nexe'
  try {
    const file = resolveModule(process.cwd())
    filename = basename(file).replace(extname(file), '')
  } catch (_) {}

  return filename === 'index' ? ('nexe_' + Date.now()) : filename
}

function extractLogLevel (options) {
  if (options.loglevel) return options.loglevel
  if (options.silent) return 'silent'
  if (options.verbose) return 'verbose'
  if (options.info) return 'info'
}

function extractName (options) {
  if (typeof options.input === 'string') {
    return options.name ||
      basename(options.input).replace(extname(options.input), '')
  }
  const mainName = tryResolveMainFileName()
  return options.name || mainName
}

function normalizeOptionsAsync (input) {
  if (argv.help || Boolean(argv._.find(x => x === 'version'))) {
    return Bluebird.fromCallback(cb => process.stderr.write(
      argv.help ? help : '2.0.0-beta.1' + EOL,
      () => cb(null, process.exit(1))
    ))
  }

  const options = Object.assign({}, defaults, input)
  delete options._
  options.loglevel = extractLogLevel(options)
  options.name = extractName(options)
  options.flags = flattenFilter(options.flag, options.flags)
  options.make = flattenFilter(options.make)
  options.vcBuild = flattenFilter(options.vcBuild)
  options.rc = options.rc || extractCliMap(/^rc-.*/, options)
  options.resources = options.resources || extractCliMap(/^resource-.*/, options)
  Object.keys(alias)
    .filter(k => k !== 'rc')
    .forEach(x => delete options[x])

  return Promise.resolve(options)
}

export {
  argv,
  normalizeOptionsAsync
}
