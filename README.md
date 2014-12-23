## This repository is not actively maintained. 

### Nexe

Nexe is a command-line utility that compiles your Node.js application into a single executable file.

![screen shot 2014-02-28 at 10 32 54 am](https://f.cloud.github.com/assets/757408/2296993/c276f7b6-a0a6-11e3-86d3-e6c5feba2a85.png)


### Motivation

- Ability to run multiple applications with *different* node.js runtimes. 
- Distributable binaries without needing node / npm.
- Starts faster.
- Lockdown specific application versions, and easily rollback.
- Faster deployments.

## Requirements

- Linux / Mac / BSD / Windows
- Windows: Python 2.6 or 2.7 (in PATH), Visual Studio 2010 or 2012

##Caveats

### Doesn't support native modules

- Use the techniques below for working around dynamic require statments to exclude the module from the bundling, and deploy along side the executable in a node_module folder so your app can find it. Note: On windows you may need to have your app be named node.exe if .node file depends on node.
 
###Doesn't support dynamic require statments
Such As:
```
var x = require(someVar);
```

In this case nexe won't bundle the file

```
	var x;
	if (someCheck) {
		x = require("./ver1.js");
	}
	else {
		x = require("./var2.js");
	}
```

In this case nexe will bundle both files.
	
Workarounds:
1) for dyanmic requires that you want bundled add the following into your project
```
	var dummyToForceIncludeForBundle = false;
	if (dummyToForceIncludeForBundle) {
		require("./loadedDynamicallyLater.js");
		...
	}
```
this will trick the bundler into including them.
	
2) for dynamic files getting included that you don't want to be
```
	var moduleName = "./ver2.js";
	if (someCheck) {
		moduleName = "./ver1.js";
	}
	var x = require(moduleName)
```
Note: neither file will be bundled.
	
Using these two techniques you can change your application code so mdoules are not bundles, and generate a includes.js file as part of your build process so that the right files get bundled for your build configuration.

### __dirname

Once the module is budnled it is part of the executable. __dirname is therefore the executable dir (process.execPath). Thus if you put resources on a realtive path from the the executable your app will be able to access them.

If you had a data file at /dev/myNodeApp/stateManager/handler/data/some.csv
and a file at /dev/myNodeApp/stateManager/handler/loader.js
```
	module.exports = fw.readFileSync(path.join(__dirname, "./data/some.csv"));
```
you would need to deploy some.csv in a sub dir data/ along side your executable

There are potential use cases for __dirname where the executable path is not the correct substitution, and could result in a silent error (possibly even in a dependciey that you are unaware of).

Note: __filename will be 'undefined'

### child_process.fork

child_process.spawn works is unmodified, but child_process.fork will make an attempt to lunch a new instance of your executable and run the bundled module.

## Installation

Via NPM:

```bash
	npm install nexe [-g]
```

Or git:

```bash
	git clone 
```

### CLI Usage

````text
	
Usage: nexe -i [sources] -o [binary]

Options:
  -i, --input    The entry javascript files         [default: cwd]
  -o, --output   The output binary                  [default: cwd/release/app.nex]
  -r, --runtime  The node.js runtime to use         [default: "0.8.15"]
  -t, --temp     The path to store node.js sources  [default: /tmp/nexe]
  -f, --flags    Don't parse node and v8 flags, pass through app flags  [default: false]

```` 


### Code Usage

````javascript

var nexe = require('nexe');

nexe.compile({
	input: 'input.js',
	output: 'path/to/bin',
	nodeVersion: '0.8.15',
	nodeTempDir: __dirname,
	flags: true
}, function(err) {
	
});
	
````
