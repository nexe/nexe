Compile javascript **with** node.js. This allows you to move your executable around *without* needing to install the node.js runtime.

## Requirements

- Linux / Mac

## Caveats

- Doesn't support native modules (yet).
- Doesn't support windows (yet).

## Installation

Via NPM:

```bash
	npm install nexe [-g]
```

Or git:

```bash
	git clone 
```


### Motivation

- Developing client-side utilities without requiring to install a bunch of dependencies first (node.js, npm).
- Ability to run multiple node.js applications with *different* node.js runtimes. 
- Distributable packages without needing node / npm.
- Loads faster.

### CLI Usage

````text
	
Usage: nexe -i [sources] -o [binary]

Options:
  -i, --input    The entry javascript files         [default: cwd]
  -o, --output   The output binary                  [default: cwd/release/app.nex]
  -r, --runtime  The node.js runtime to use         [default: "0.8.15"]
  -t, --temp     The path to store node.js sources  [default: /tmp/nexe]


```` 


### Code usage

````javascript

var nexe = require('nexe');

nexe.compile({ input: 'input.js', output: 'path/to/bin', runtime: '0.8.15' } function() {
	
});
	
````





