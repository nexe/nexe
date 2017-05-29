import parseArgv from 'minimist'
import { basename, extname, join } from 'path'
import Bluebird from 'bluebird'
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
  targets: [],
  vcBuild: ['nosign', 'release'],
  bundle: false,
  build: false,
  enableNodeCli: false,
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
  b: 'bundle',
  cli: 'enableNodeCli',
  h: 'help',
  l: 'loglevel'
}
const argv = parseArgv(process.argv, { alias, default: defaults })
const help = `
nexe --help              CLI OPTIONS

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
  -b   --bundle     =webpack-config.js      -- use default configuration or provide custom webpack config
       --temp       =./path/to/temp         -- nexe temp files (for downloads and source builds)
       --ico                                -- file name for alternate icon file (windows)
       --rc-*                               -- populate rc file options (windows)
       --clean                              -- force download of sources
       --enableNodeCli                      -- enable node cli enforcement (blocks app cli)
       --sourceUrl                          -- pass an alternate source (node.tar.gz) url
       --silent                             -- disable logging
       --verbose                            -- set logging to verbose

       -* variable key name                 * option can be used more than once`.trim()

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
      map[key] = options[option]
      delete options[option]
      return map
    }, {})
}

function tryResolveMainFileName () {
  let filename
  try {
    const file = require.resolve(process.cwd())
    filename = basename(file).replace(extname(file), '')
  } catch (_) {}

  return !filename || filename === 'index' ? ('nexe_' + Date.now()) : filename
}

function extractLogLevel (options) {
  if (options.loglevel) return options.loglevel
  if (options.silent) return 'silent'
  if (options.verbose) return 'verbose'
  return 'info'
}

function extractName (options) {
  let name = options.name
  if (typeof options.input === 'string' && !name) {
    name = basename(options.input).replace(extname(options.input), '')
  }
  name = name || tryResolveMainFileName()
  return name.replace(/\.exe$/, '')
}

function normalizeOptionsAsync (input) {
  if (argv.help || argv._.some(x => x === 'version')) {
    return Bluebird.fromCallback(cb => process.stderr.write(
      argv.help ? help : '2.0.0-beta.1' + EOL,
      () => cb(null, process.exit(0))
    ))
  }

  const options = Object.assign({}, defaults, input)
  delete options._
  options.loglevel = extractLogLevel(options)
  options.name = extractName(options)
  options.flags = flattenFilter(options.flag, options.flags)
  options.targets = flattenFilter(options.target, options.targets)
  options.make = flattenFilter(options.make)
  options.vcBuild = flattenFilter(options.vcBuild)
  options.resources = flattenFilter(options.resource, options.resources)
  options.rc = options.rc || extractCliMap(/^rc-.*/, options)

  if (options.build || options.padding === 0) {
    options.targets = []
    options.build = true
  } else if (!options.targets.length) {
    const defaultTarget = [process.platform, process.arch, options.version].join('-')
    options.targets = [defaultTarget]
  }

  Object.keys(alias)
    .filter(k => k !== 'rc')
    .forEach(x => delete options[x])

  return Promise.resolve(options)
}

export {
  argv,
  normalizeOptionsAsync
}
