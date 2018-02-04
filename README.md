<p align="center"><img src="https://cloud.githubusercontent.com/assets/2391349/23598327/a17bb68a-01ee-11e7-8f55-88a5fc96e997.png" /></p>

<p align="center">
  <a href="https://circleci.com/gh/nexe/nexe"><img src="https://img.shields.io/circleci/project/nexe/nexe.svg" alt="Build Status"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/dt/nexe.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/v/nexe.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/l/nexe.svg" alt="License"></a>
  <a href="https://gitter.im/nexe/nexe?utm_source=badge&utm_medium=badge"><img src="https://badges.gitter.im/nexe/nexe.svg"></a>
</p>

<p align="center"><code>npm i nexe -g</code></p>
<p align="center">Nexe is a command-line utility that compiles your Node.js application into a single executable file.</p>

<p align="center">
  <img src="https://user-images.githubusercontent.com/5818726/30999006-df7e0ae0-a497-11e7-96db-9ce87ae67b34.gif"/>
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

### Examples

- `nexe server.js -r public/**/*.html`
- `nexe my-bundle.js --no-bundle -o app.exe`
- `nexe --build`
- `nexe -t x86-8.0.0`

## Resources

Additional files or resources can be added to the binary by passing `-r "glob/pattern/**/*"`. These included files can be read in the application by using `fs.readFile` or `fs.readFileSync`.

## Compiling Node

By default `nexe` will attempt to download a pre-built executable. However, It may be unavailable ([github releases](https://github.com/nexe/nexe/releases))
or you may want to customize what is built. See `nexe --help` for a list of options available when passing the [`--build`](#build-boolean) option. You will also need to ensure your environment is setup to [build node](https://github.com/nodejs/node/blob/master/BUILDING.md). Note: the `python` binary in your path should be an acceptable version of python 2. eg. Systems that have python2 will need to create a [symlink](https://github.com/nexe/nexe/issues/354#issuecomment-319874486).

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
    - An object or string describing platform-arch-version. e.g. `'windows-ia32-6.10.3'`
      - each segment is optional, and will be merged with the current environment
      - Examples: ([full list](https://github.com/nexe/nexe/releases))
        - `'win32-x86-8.6.0`
        - `{ platform: 'alpine' }`
        - `darwin-8.6.0`
        - `linux-x64`
        - `macos-8.4.0`

        See [test/target.spec.ts](test/target.spec.ts)
    - If the [`build`](#build-boolean) flag is set, the platform portion of the target is ignored.
    - default: `process`
- #### `bundle: string | boolean`
    - If a string is provided it must be a valid relative module path
    and should provide an export with the following signature:
    ```typescript
    export function createBundle (options: NexeOptions): Promise<string>
    ```
    - default: true
 - #### `name: string`
    - Module friendly name of the application
    - default: basename of the input file, or `nexe_${Date.now()}`
 - #### `cwd: string`
    - Directory nexe will operate on as though it is the cwd
    - default: process.cwd()
 - #### `build: boolean`
    - Build node from source, passing this flag tells nexe to download and build from source. Subsequently using this flag will cause nexe to use the previously built binary. To rebuild, first add [`--clean`](#clean-boolean)
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
 - #### `vcBuild: string[]`
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
    - Path to a user provided icon to be used (Windows only). Requires `--build` to be set.
 - #### `rc: object`
    - Settings for patching the [node.rc](https://github.com/nodejs/node/blob/master/src/res/node.rc) configuration file (Windows only).
    - Example:
      ```javascript
        {
          CompanyName: "ACME Corp",
          PRODUCTVERSION: "17,3,0,0",
          FILEVERSION: "1,2,3,4"
          ...
        }
      ```
    - default: `{}`
 - #### `clean: boolean`
    - If included, nexe will remove temporary files for the accompanying configuration and exit
 - #### `enableNodeCli: boolean`
    - Enable the original Node CLI (will prevent application cli from working).
    - Node CLI arguments passed via the [NODE_OPTIONS](https://nodejs.org/api/cli.html#cli_node_options_options) environment
      variable will still be processed. NODE_OPTIONS support can be disabled with the `--without-node-options` configure flag.
    - default: `false`
  - #### `fakeArgv: boolean`
    - fake the entry point file name (`process.argv[1]`). If nexe was used with stdin this will be `'[stdin]'`. 
 - #### `ghToken: string`
    - Provide a Github Token for accessing nexe releases
    - This is usually needed in CI environments
    - default: `process.env.GITHUB_TOKEN`
 - #### `sourceUrl: string`
    - Provide an alternate url for the node source code
    - Note: temporary files will still be created for this under the specified version
 - #### `loglevel: string`
    - Set the loglevel, info, silent, or verbose
    - default: `'info'`
 - #### `patches: NexePatch[]`
    - Userland patches for patching or modifying node source
    - default: `[]`
 - #### `plugins: NexePatch[]`
    - Userland plugins for modifying nexe executable behavior
    - default: `[]`

### `NexePatch: (compiler: NexeCompiler, next: () => Promise<void>) => Promise<void>`

Patches and Plugins are just a middleware functions that take two arguments, the `compiler`, and `next`. The compiler is described below, and `next` ensures that the pipeline continues. Its invocation should always be awaited or returned to ensure correct behavior. Patches also require that [`--build`](#build-boolean) be set, while plugins do not.

For examples, see the built in patches: [src/patches](src/patches).

### `NexeCompiler`

 - `setFileContentsAsync(filename: string, contents: string): Promise<void>`
    - Quickly set a file's contents within the downloaded Node.js source.
 - `replaceInFileAsync(filename: string, ...replaceArgs): Promise<void>`
    - Quickly perform a replace in a file within the downloaded Node.js source. The rest arguments are passed along to `String.prototype.replace`
 - `readFileAsync(filename: string): Promise<NexeFile>`
    - Access (or create) a file within the downloaded Node.js source.
 - `addResource(filename: string, contents: Buffer): void`
    - Add a resource to the nexe bundle
 - `files: NexeFile[]`
    - The cache of the currently read, modified, or created files within the downloaded Node.js source.

#### `NexeFile`
  - `contents: string`
  - `absPath: string`
  - `filename: string`

Any modifications made to `NexeFile#contents` will be maintained in the cache _without_ the need to explicitly write them back out, e.g. using `NexeCompiler#setFileContentsAsync`.

## Native Modules

Any `.node` binding can be used with nexe. These library files will be bundled and written alongside the resulting binary at runtime. Currently, nexe supports modules loaded directly (`.node` files) and those loaded with the `'bindings'` module. It does not yet support modules using `node-pre-gyp#find`. 

Its important to note: unless your native module conditionally loads each platform binary. Nexe builds with native modules will be platform specific. Eg. You will no longer be able to use cross platform builds. 

Nexe builds with native modules will need to target the same version, platform and architecture as the platform hosting the module. At least until [N-API](https://github.com/nodejs/abi-stable-node) is fully propegated

TODO

- [ ] Implement support for `node-pre-gyp#find`.

## Contributing

Building
```
$ git clone git@github.com:nexe/nexe.git
$ cd nexe
$ yarn
```

Testing
```
$ npm test
```

## Maintainers

[![Jared Allard](https://avatars.githubusercontent.com/u/2391349?s=130)](https://jaredallard.me/) | [![Caleb Boyd](https://avatars.githubusercontent.com/u/5818726?s=130)](https://github.com/calebboyd) | [![Dustin Greif](https://avatars.githubusercontent.com/u/3026298?s=130)](https://github.com/dgreif) |
---|---|---|---
[Jared Allard](https://github.com/jaredallard) | [Caleb Boyd](http://github.com/calebboyd) |  [Dustin Greif](https://github.com/dgreif) |

### Former

- [Craig Condon](http://crcn.codes/)
