<p align="center"><img src="https://cloud.githubusercontent.com/assets/2391349/23598327/a17bb68a-01ee-11e7-8f55-88a5fc96e997.png" /></p>

<p align="center">
  <a href="https://circleci.com/gh/jaredallard/nexe"><img src="https://img.shields.io/circleci/project/jaredallard/nexe.svg" alt="Build Status"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/dt/nexe.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/v/nexe.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/nexe"><img src="https://img.shields.io/npm/l/nexe.svg" alt="License"></a>
</p>

<p align="center">Nexe is a command-line utility that compiles your Node.js application into a single executable file.</p>

![screenshot](https://cloud.githubusercontent.com/assets/2391349/23597575/e333884c-01e8-11e7-9fbf-3a83088bc748.png)

## Supporting nexe

nexe is a MIT license project. Please consider joining our [backers](https://github.com/nexe/nexe/BACKERS.md) by contributing to [nexe's Patreon](https://patreon.com/user?u=5264722).

### Motivation

- Ability to run multiple applications with *different* node.js runtimes.
- Distributable binaries without needing node / npm.
- Starts faster.
- Lockdown specific application versions, and easily rollback.
- Faster deployments.

## Building Requirements

- Linux / Mac / BSD / Windows
- Python 2.6 or 2.7 (use --python if not in PATH)
- Windows: Visual Studio 2010+

## Caveats

### Doesn't support native modules

- Use the techniques below for working around dynamic require statements to exclude the module from the bundling, and deploy along side the executable in a node_module folder so your app can find it. Note: On windows you may need to have your app be named node.exe if .node file depends on node.

### Doesn't support dynamic require statements

Such As:

```javascript
var x = require(someVar);
```

In this case nexe won't bundle the file

```javascript
	var x;
	if (someCheck) {
		x = require("./ver1.js");
	} else {
		x = require("./ver2.js");
	}
```

In this case nexe will bundle both files.

Workarounds:
1) for dynamic requires that you want bundled add the following into your project

```javascript
	var dummyToForceIncludeForBundle = false;
	if (dummyToForceIncludeForBundle) {
		require("./loadedDynamicallyLater.js");
		// ...
	}
```
this will trick the bundler into including them.

2) for dynamic files getting included that you don't want to be

```javascript
	var moduleName = "./ver2.js";
	if (someCheck) {
		moduleName = "./ver1.js";
	}
	var x = require(moduleName);
```
Note: neither file will be bundled.

Using these two techniques you can change your application code so modules are not bundles, and generate a includes.js file as part of your build process so that the right files get bundled for your build configuration.

### &#95;&#95;dirname

Once the module is bundled it is part of the executable. &#95;&#95;dirname is therefore the executable dir (process.execPath). Thus if you put resources on a relative path from the the executable your app will be able to access them.

If you had a data file at `/dev/myNodeApp/stateManager/handler/data/some.csv`
and a file at `/dev/myNodeApp/stateManager/handler/loader.js`

```javascript
	module.exports = fw.readFileSync(path.join(__dirname, "./data/some.csv"));
```
You would need to deploy some.csv in a sub dir `data/` along side your executable

There are potential use cases for &#95;&#95;dirname where the executable path is not the correct substitution, and could result in a silent error (possibly even in a dependency that you are unaware of).

Note: &#95;&#95;filename will be 'undefined'

### child_process.fork

child_process.spawn works is unmodified, but child_process.fork will make an attempt to launch a new instance of your executable and run the bundled module.

## Installation

Via NPM:

```bash
	npm install nexe [-g]
```

Or git:

```bash
	git clone https://github.com/jaredallard/nexe.git
```

### CLI Usage

```text

Usage: nexe -i [sources] -o [binary] [options]

Options:
	-i, --input    The entry javascript files         [default: cwd]
	-o, --output   The output binary                  [default: out.nex]
	-r, --runtime  The node.js runtime to use         [default: "latest"]
	-t, --temp     The path to store node.js sources  [default: ./tmp/nexe]
	-f, --flags    Don't parse node and v8 flags, pass through app flags  [default: false]
	-v, --version  Display version number
	-p, --python   Set path of python to use.         [default: "python"]
	-F, --framework Set the framework to use.          [default: "nodejs"]

```


### Code Usage

```javascript

var nexe = require('nexe');

nexe.compile({
	input: 'input.js', // where the input file is
	output: 'path/to/bin', // where to output the compiled binary
	nodeVersion: '5.5.0', // node version
	nodeTempDir: 'src', // where to store node source.
	nodeConfigureArgs: ['opt', 'val'], // for all your configure arg needs.
	nodeMakeArgs: ["-j", "4"], // when you want to control the make process.
	nodeVCBuildArgs: ["nosign", "x64"], // when you want to control the make process for windows.
										// By default "nosign" option will be specified
										// You can check all available options and its default values here:
										// https://github.com/nodejs/node/blob/master/vcbuild.bat
	python: 'path/to/python', // for non-standard python setups. Or python 3.x forced ones.
	resourceFiles: [ 'path/to/a/file' ], // array of files to embed.
	resourceRoot: [ 'path/' ], // where to embed the resourceFiles.
	flags: true, // use this for applications that need command line flags.
	jsFlags: "--use_strict", // v8 flags
	startupSnapshot: 'path/to/snapshot.js', // when you want to specify a script to be
											// added to V8's startup snapshot. This V8
											// feature deserializes a heap to save startup time.
											// More information in this blog post:
											// http://v8project.blogspot.de/2015/09/custom-startup-snapshots.html
    patchFns: function(compiler, options, callback) {
      // custom monkeyPatching hook, can be a function or an array of functions
      ...
      callback();
    }
	framework: "node" // node, nodejs, or iojs
}, function(err) {
	if(err) {
		return console.log(err);
	}

	 // do whatever
});

```

### package.json inclusion

As of 0.4.0 you can now embed nexe options into package.json. Note that this Format
is still in works, so it is likely to change.

```json
"nexe": {
	"input": "./bin/nexe",
	"output": "nexe^$",
	"temp": "src",
	"browserify": {
		"requires": [],
		"excludes": [],
		"paths": []
	},
	"runtime": {
		"framework": "node",
		"version": "5.6.0",
		"js-flags": "--use_strict",
		"ignoreFlags": true
	}
}
```

Notes:

* output: can use ^$ for platform specific file extension
* js-flags: this is also known as v8 flags, and supports *all* v8 flags.

### Browserify Require Issues

If you have requires that aren't resolving well, you can do two things.

Try adding it to `nexe.browserify.requires` in your `package.json`

```json
"nexe": {
	.......
	"browserify": {
		"requires": [
			{
				"file": "myfile.js",
				"expose": "mymodule"
			},
			"mymodule.js"
		],
		"excludes": [],
		"paths": []
	},
	.......
}
```

Or, if that doesn't work (it tends to not work sometimes), you can try altering
browserify.paths like so:

```json
"nexe": {
	.......
	"browserify": {
		"requires": []
		"excludes": [],
		"paths": ["/path/to/my/loc"]
	},
	.......
}
```

If it *still* doesn't work, file a bug with what you tried! (also try using `nexe@0.4.2`)

## Maintainers

* __Jared Allard__ ([@jaredallard](https://github.com/jaredallard)) &lt;[jaredallard@outlook.com](mailto:jaredallard@outlook.com)&gt; (Active)
* __Christopher Karper__ ([@ckarper](https://github.com/CKarper)) &lt;[Christopher.Karper@gmail.com](mailto:Christopher.Karper@gmail.com)&gt; (Active)
* __Craig Condon__ ([@crcn](https://github.com/crcn)) &lt;[craig.j.condon@gmail.com](mailto:craig.j.condon@gmail.com)&gt; (Old Project Owner)
