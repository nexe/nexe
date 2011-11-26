## Requirements

- Linux / Mac

## Installation

Via NPM:

```bash
	npm install nexe
```

Or git:

```bash
	git clone 
```

### Features

- Compiled **with** node.js. This allows you to move your executable around *without* needing to install the node.js runtime.


### Motivation

- Developing client-side utilities without requiring to install a bunch of dependencies first (node.js, npm).
- Ability to run multiple node.js applications with *different* node.js runtimes. 


### CLI Usage

````text
	
Commands:
	-i 			 the input javascript files
	-o      	 the output executable
	--runtime    the runtime version of node.js to compile with

Examples:
	-i input.js -o my-binary --runtime=0.6.2    compile javascript file with node  

```` 


### Code usage

````javascript

	var nexe = require('nexe');

	nexe.compile('input.js', 'output.bin', function() {
		
	});
	
````





