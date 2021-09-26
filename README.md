
<p align="center"><img src="https://cloud.githubusercontent.com/assets/2391349/23598327/a17bb68a-01ee-11e7-8f55-88a5fc96e997.png" /></p>

<p align="center">
  <a href="https://dev.azure.com/nexe-ci/Nexe/_build?definitionId=1"><img src="https://img.shields.io/azure-devops/build/nexe-ci/nexe/1/master.svg" alt="Build Status"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/dt/nexe.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/v/nexe.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/l/nexe.svg" alt="License"></a>
  <a href="https://discord.gg/2qTH52zNcZ"><img src="https://discordapp.com/api/guilds/814334925049561168/widget.png?style=shield"></a>
</p>

<p align="center">Install:&nbsp<code>npm i nexe -g</code></p>
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

- `nexe server.js -r "public/**/*.html"`
- `nexe --build`
- `nexe -t x86-8.0.0`

## Resources

Additional files or resources can be added to the binary by passing `-r "glob/pattern/**/*"`. These included files can be read in the application by using `fs.readFile` or `fs.readFileSync`.

## Compiling the nexe Executable

By default `nexe` will attempt to download a pre-built executable. These are listed on the [releases page](https://github.com/nexe/nexe/releases/tag/v3.3.3). The exact version you want may be unavailable or you may want to customize what is built. See `nexe --help` for a list of options available when passing the [`--build`](#build-boolean) option. You will also need to ensure your environment is setup to [build node](https://github.com/nodejs/node/blob/master/BUILDING.md). Note: the `python` binary in your path should be an acceptable version of python 2. eg. Systems that have python 2 will need to create a [symlink](https://github.com/nexe/nexe/issues/354#issuecomment-319874486).

### Linux and macOS
[Prerequisites & details](https://github.com/nodejs/node/blob/master/BUILDING.md#unix-and-macos)

### Windows

The fastest and most reliable way to get started is simply to run the commands below. If you'd rather read the details or perform a manual install of the prerequisites, [you can find that here](https://github.com/nodejs/node/blob/master/BUILDING.md#windows).

The instructions below are the fastest and most reliable method.
Run the following sets of commands with PowerShell (running as Administrator).

**Install all required build tools (and dependencies):**
```
Set-ExecutionPolicy Unrestricted -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://boxstarter.org/bootstrapper.ps1'))
get-boxstarter -Force
Install-BoxstarterPackage https://raw.githubusercontent.com/nodejs/node/master/tools/bootstrap/windows_boxstarter -DisableReboots
```

**Set config:**
```
npm config set msvs_version 2019
npm config set python python2.7
```
Where `2019` is the version of Visual Studio you have (if you have it).

**Notes:**
- The above works and has been tested with node.js `14.5.4` and `15.8.0`
- Python 3 and Python 2 can coexist and `nexe` will still work, considering the `set config` area above
- Don't use `npm install windows-build-tools` unless you're having some type of issue, because the above commands configures and installs the latest/preferred too.

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
    - An object or string describing platform-arch-version. e.g. `'windows-ia32-10.13.0'`
      - each segment is optional, and will be merged with the current environment
      - Examples: ([full list](https://github.com/nexe/nexe/releases))
        - `'win32-x86-10.13.0`
        - `{ platform: 'alpine' }`
        - `darwin-10.13.0`
        - `linux-x64`
        - `macos-10.13.0`

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
 - #### `mangle: boolean`
    - If set to false, nexe will not include the virtual filesystem (your application and resources) on the output.
    - This will cause the output to error as an "Invalid Binary" unless a userland patch alters the contents of lib/_third_party_main.js in the nodejs source.
    - default: true
 - #### `build: boolean`
    - Build node from source, passing this flag tells nexe to download and build from source. Subsequently using this flag will cause nexe to use the previously built binary. To rebuild, first add [`--clean`](#clean-boolean)
 - #### `remote: string`
    - Provide a custom remote location for fetching pre-built nexe binaries from. This can either be an HTTP or HTTPS URL.
    - default: `null`
 - #### `asset: string`
    - Provide a pre-built nexe binary asset, this is a file path is resolved relative to cwd.
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
    - Array of arguments for the node build make step
    - default: `[]`
 - #### `vcBuild: string[]`
    - Options for windows build
    - default: `['nosign', 'release']`
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
    - default: `~/.nexe`
 - #### `ico: string`
    - Path to a user provided icon to be used (Windows only). Requires `--build` to be set.
 - #### `rc: object`
    - Settings for patching the [node.rc](https://github.com/nodejs/node/blob/master/src/res/node.rc) configuration file (Windows only).
    - Example (keys may vary depending on the version. Reference the file linked above):
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
 - `addResource(filename: string, contents: Buffer): Promise<void>`
    - Add a resource to the nexe bundle
 - `files: NexeFile[]`
    - The cache of the currently read, modified, or created files within the downloaded Node.js source.

#### `NexeFile`
  - `contents: string`
  - `absPath: string`
  - `filename: string`

Any modifications made to `NexeFile#contents` will be maintained in the cache _without_ the need to explicitly write them back out, e.g. using `NexeCompiler#setFileContentsAsync`.

## Native Modules

In order to use native modules, the native binaries must be shipped alongside the binary generated by nexe.

## Troubleshooting

`Error: Entry file "" not found!` means you need to provide `nexe` with input. Either use `-i` or pipe data to it.

`Error: https://github.com/nexe/nexe/releases/download/v3.3.3/windows-x64-15.8.0 is not available, create it using the --build flag` or similar message means that it either:
- You are having networking issues such as the download being blocked
- You should specify the target so `nexe` knows what version of the executable to use.
	- See the [releases page](https://github.com/nexe/nexe/releases) to find the executable's version number
	- Example
		- `nexe -i "app.js" -r "public/**/*.html" -o "dist/myApp.exe" -t x64-14.15.3`
		- where `-i` specifies the input, `-r` specifies resources to embed, `-o` specifies the output, `-t` specifies the target.
	- Alternatively you can compile the executable yourself, see that section for details

## Contributing

Building
```
$ git clone git@github.com:nexe/nexe.git
$ cd nexe
$ npm i && npm run build
```

Testing
```
$ npm test
```
