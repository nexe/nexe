const
  parseArgv = require('minimist'),
  { basename, extname, join } = require('path'),
  EOL = require('os').EOL,
  padRight = (str, l) => {
    while (str.length < l) {
      str += ' '
    }
    return str.substr(0, l)
  },
  defaults = {
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
  },
  alias = {
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
  },
  argv = parseArgv(process.argv, { alias, default: defaults }),
  help = `
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
  Object.keys(options).filter(x => match.test(x))
    .reduce((map, option) => {
      const key = option.split('-')[1]
      map = map || {}
      map[key] = options[option]
      delete options[option]
      return map
    }, null)
}

function extractName (options) {
  if (typeof options.input === 'string') {
    return options.name
      || basename(options.input).replace(extname(options.input), '')
  }
  const mainName = basename(require.resolve(process.cwd()))
  return options.name || mainName.replace(extname(mainName), '')
}

function normalizeOptions (input) {
  if (input.__normalized) {
    return input
  }

  if (argv.help || Boolean(argv._.find(x => x === 'version'))) {
    process.stderr.write(
      argv.help ? help : 'next' + EOL,
      () => process.exit(0)
    )
  }

  const options = Object.assign({}, defaults, input)
  delete options._
  delete alias.rc
  options.loglevel = options.loglevel
    || options.silent && 'silent'
    || options.verbose && 'verbose' || 'info'
  options.name = extractName(options)
  options.flags = flattenFilter(options.flag, options.flags)
  options.make = flattenFilter(options.make)
  options.vcBuild = flattenFilter(options.vcBuild)
  options.rc = options.rc || extractCliMap(/^rc-.*/, options)
  options.resources = options.resources || extractCliMap(/^resource-.*/, options)
  Object.keys(alias).forEach(x => delete options[x])

  options.__normalized = true
  return options
}

module.exports.normalizeOptions = normalizeOptions
module.exports.options = normalizeOptions(argv)
