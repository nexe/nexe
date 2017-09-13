<p align="center"><img src="https://cloud.githubusercontent.com/assets/2391349/23598327/a17bb68a-01ee-11e7-8f55-88a5fc96e997.png" /></p>

<p align="center">
  <a href="https://circleci.com/gh/nexe/nexe"><img src="https://img.shields.io/circleci/project/nexe/nexe.svg" alt="Build Status"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/dt/nexe.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/v/nexe.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/l/nexe.svg" alt="License"></a>
</p>

<p align="center"><code>npm i nexe -g</code></p>
<p align="center">Nexe is a command-line utility that compiles your Node.js application into a single executable file.</p>

<p align="center">
  <img src="https://cloud.githubusercontent.com/assets/5818726/26533446/ce19ee5a-43de-11e7-9540-caf7ebd93370.gif"/>
</p>

## Motivation and Features

- Self contained applications
- Ability to run multiple applications with *different* node.js runtimes.
- Distribute binaries without needing node / npm.
- Idempotent builds
- Start and deploy faster.
- Lockdown specific application versions, and easily rollback.
- Flexible build pipeline
- Cross platform builds

## Usage

- Application entrypoint:

  `nexe my-app.js`

- stdin interface

  `rollup -c | nexe --resource "./public/**/*" -o my-app.exe`

For more CLI options see: `nexe --help`

# Advanced

## Resources

Additional files or resources can be added to the binary by passing `-r "glob/pattern/**/*"`. These included files can be read in the application by using `fs.readFile` or `fs.readFileSync`

## Compiling Node

By default `nexe` will attempt to download a pre-built executable. However, It may be unavailable ([github releases](https://github.com/nexe/nexe/releases))
or you may want to customize what is built. See `nexe --help` for a list of options available when passing the `--build` option. You will also need to ensure your environment is setup to [build node](https://github.com/nodejs/node/blob/master/BUILDING.md)

## Node.js API

#### Example

```javascript
const { compile } = require('nexe')

compile({
  input: './my-app.js',
  build: true, //required to use patches
  patches: [
    async (compiler, next) => {
      await compiler.setFileContentsAsync(
        'lib/new-native-module.js',
        'module.exports = 42'
      )
      return next()
    }
  ]
}).then(() => {
  console.log('success')
})
```
## NexeOptions

### `options: object`

 - #### `input: string`
    - Input bundle file path
    - default: stdin or the current directory's main file (package.json)
 - #### `output: string`
    - Output executable file path
    - default: same as `name` with an OS specific extension.
 - #### `target: string | object`
    - Combination of platform-arch-version. e.g. `'win32-ia32-6.10.3'`
      - each segment is optional, and will be merged with the current environment
    - default: `process`
- #### `bundle: string | boolean`
    - If a string is provided it must be a valid relative module path
    and should provide an export with the following signature:
    ```typescript
    export function createBundle (options: NexeOptions): Promise<string>`
    ```
    - default: true
 - #### `name: string`
    - Module friendly name of the application
    - default: basename of the input file, or `nexe_${Date.now()}`
 - #### `cwd: string`
    - Directory nexe will operate on as though it is the cwd
    - default: process.cwd()
 - #### `build: boolean`
    - Build node from source
 - #### `python: string`
    - On Linux this is the path pointing to your python2 executable
    - On Windows this is the directory where `python` can be accessed
    - default: `null`
 - #### `flags: string[]`
    - Array of node runtime flags to build node with.
    - Example: `['--expose-gc']`
    - default: `[]`
 - #### `configure: string[]`
    - Array of arguments for the node build configure step
    - Example: `['--with-dtrace', '--dest-cpu=x64']`
    - default: `[]`
 - #### `make: string[]`
    - Array of arguments for the node build make step, on windows this step recieves options for vcBuild.bat
    - default: `[]` or `['nosign', 'release']` for non windows systems
 - #### `make: string[]`
    - Alias for `make` option
 - #### `snapshot: string`
    - path to a file to be used as the warmup snapshot for the build
    - default: `null`
 - #### `resources: string[]`
    - Array of globs with files to include in the build
    - Example: `['./public/**/*']`
    - default: `[]`
 - #### `temp: string`
    - Path to use for storing nexe's build files
    - Override in the env with `NEXE_TEMP`
    - default: `./.nexe` in the cwd
 - #### `ico: string`
    - Path to a user provided icon to be used (Windows only).
 - #### `rc: object`
    - Settings for patching the [node.rc](https://github.com/nodejs/node/blob/master/src/res/node.rc) configuration file (Windows only).
    - Example: `{ CompanyName: "ACME Corp" }`
    - default: `{}`
 - #### `clean: boolean`
    - If included, nexe will remove temporary files for the accompanying configuration and exit
 - #### `enableNodeCli: boolean`
    - Enable the original Node CLI (will prevent application cli from working)
    - default: `false`
  - #### `fakeArgv: boolean`
    - fake the entry point file name (`process.argv[1]`). If nexe was used with stdin this will be `'[stdin]'`. 
 - #### `sourceUrl: string`
    - Provide an alternate url for the node source code
    - Note: temporary files will still be created for this under the specified version
 - #### `loglevel: string`
    - Set the loglevel, info, silent, or verbose
    - default: `'info'`
 - #### `patches: NexePatch[]`
    - Userland patches for patching or modifying node source
    - default: `[]`

### `NexePatch: (compiler: NexeCompiler, next: () => Promise<void>) => Promise<void>`

A patch is just a middleware function that takes two arguments, the `compiler`, and `next`. The compiler is described below, and `next` ensures that the pipeline continues. Its invocation should always be awaited or returned to ensure correct behavior.

For examples, see the built in patches: [src/patches](src/patches)

### `NexeCompiler`

 - `setFileContentsAsync(filename: string, contents: string): Promise<void>`
    - Quickly set a file's contents within the downloaded Node.js source.
 - `replaceInFileAsync(filename: string, ...replaceArgs): Promise<void>`
    - Quickly perform a replace in a file within the downloaded Node.js source. The rest arguments are passed along to `String.prototype.replace`
 - `readFileAsync(filename: string): Promise<NexeFile>`
    - Access (or create) a file within the downloaded Node.js source.
 - `files: NexeFile[]`
    - The cache of the currently read, modified, or created files within the downloaded Node.js source.

#### `NexeFile`
  - `contents: string`
  - `absPath: string`
  - `filename: string`

Any modifications made to `NexeFile#contents` will be maintained in the cache _without_ the need to explicitly write them back out, e.g. using `NexeCompiler#setFileContentsAsync`.

## Native Modules

Nexe has a plugin built for use with [fuse-box](http://fuse-box.org) > 2.2.1. This plugin currently supports modules that require `.node` files and those that use the `bindings` module.
Take a look at the (windows) [example](examples/native-build/build.js)

- [ ] Implement support `node-pre-gyp#find`.

## Maintainers

[![Jared Allard](https://avatars.githubusercontent.com/u/2391349?s=130)](https://jaredallard.me/) | [![Caleb Boyd](https://avatars.githubusercontent.com/u/5818726?s=130)](https://github.com/calebboyd) | [![Christopher Karper](https://avatars.githubusercontent.com/u/653156?s=130)](https://github.com/ckarper) | [![Dustin Greif](https://avatars.githubusercontent.com/u/3026298?s=130)](https://github.com/dgreif) |
---|---|---|---
[Jared Allard](https://github.com/jaredallard) | [Caleb Boyd](http://github.com/calebboyd) | [Christopher Karper](https://github.com/ckarper) | [Dustin Greif](https://github.com/dgreif) |

### Former

- [Craig Condon](http://crcn.codes/)
