var step = require("step"),
outcome = require("outcome"),
request = require("request"),
fs = require("fs"),
mkdirp = require("mkdirp"),
path = require("path"),
child_process = require("child_process"),
exec = child_process.exec,
spawn = child_process.spawn,
sprintf = require("sprintf").sprintf,
ncp = require("ncp").ncp,
sardines = require("sardines");

/**
 */

exports.compile = function(args, next) {

	var on = outcome.error(next);

	args.input = require.resolve(args.input);

	step(

		/**
		 * 1. download node
		 */

		function() {
			downloadNode(args.runtime, args.temp, this);
		},

		/**
		 * 2. build the script into ONE file
		 */

		on.success(function(node) {
			console.log("making application bundle with %s", args.input);
			this.node = node;

			sardines({ entries: [args.input], platform: "node" }, this);
		}),


		on.success(function(content) {
			console.log("writing application bundle: \n\n%s\n\n", content);
			fs.writeFile(this.nexePath = path.join(this.node.dir, "lib", "nexe.js"), content, "utf8", this);
		}),

		/**
		 * 4. monkeypatch the node entry
		 */

		on.success(function() {
			console.log("monkey patching node.js file");
			monkeyPatchNodejs(this.node, this);
		}),

		/**
		 * 5. bundle it all together
		 */

		on.success(function() {
			console.log("building node.js");
			this.node.make(this);
		}),

		/**
		 * 6. copy the executable
		 */

		on.success(function() {
			console.log("copying binary to output directory to %s", args.output);

			mkdirp(path.dirname(args.output), this);
		}),

		/**
		 */

		function() {
			ncp(this.node.releasePath, args.output, this);
		},

		/**
		 */

		next

	);
};

/**
 */

function downloadNode(version, temp, next) {

	var tmpPath = path.join(temp, "node-" + version + ".tar.gz"),
	srcDr       = tmpPath.replace(/\.tar.gz$/, "");

	try {

		mkdirp.sync(path.dirname(tmpPath));

	//an error will usually occur when the dir already exists.
	} catch(e) { }

	step(

		/**
		 * download
		 */

		function() {

			//zip exists?
			if(fs.existsSync(tmpPath) || fs.existsSync(srcDr)) return this();

			console.log("downloading node %s", version);

			var output = fs.createWriteStream(tmpPath, { "flags": "w+" }),
			req = request("http://nodejs.org/dist/node-" + version + ".tar.gz").pipe(output);

			output.on("close", this);
		},

		/**
		 * untar
		 */

		function() {

			//source dir exists?
			if(fs.existsSync(srcDr)) return this();

			console.log("unzipping node source");


			//TODO - use native zlib library for this
			exec(sprintf("tar -xf '%s'", tmpPath), { cwd: path.dirname(tmpPath) }, this);
		},

		/**
		 * cleanup the node.js file
		 */

		function() {
			fs.unlink(tmpfile, this);
		},

		/**
		 * return make script
		 */

		function() {
			next(null, {

				//the directory to the node.js file
				dir: srcDr,

				releasePath: path.join(srcDr, "out/Release/node"),

				//makes node.js
				make: function(next) {
					var configure = spawn('./configure', [], { cwd: srcDr });
					configure.stdout.on('data', function(data) {
						process.stdout.write(data.toString());
					});
					configure.stderr.on('data', function(data) {
						process.stderr.write(data.toString());
					});
					configure.on('close', function() {
						var make = spawn('make', [], { cwd: srcDr });
						make.stdout.on('data', function(data) {
							process.stdout.write(data.toString());
						});
						make.stderr.on('data', function(data) {
							process.stderr.write(data.toString());
						});
						make.on('close', next);
					});
				}
			});
		}
	);
}

/**
 */

function monkeyPatchNodejs(node, next) {

	var nodejsPath = path.join(node.dir, "src", "node.js"),
	nodegypPath    = path.join(node.dir, "node.gyp"),
	on = outcome.error(next);

	step(

		/**
		 * read the node.js file
		 */

		function() {
			fs.readFile(nodejsPath, "utf8", this);
		},

		/**
		 * inject nexe as _eval IF it hasn't already been injected
		 */

		on.success(function(content) {

			//nexe already injected?
			if(~content.indexOf('nexe')) return this();

			fs.writeFile(nodejsPath,
			content.replace(/\(function\(process\) \{/,'(function(process) {\n  process._eval = \'require("nexe");\';\n  process.argv.unshift("node");\n'),
			"utf8",
			this);
		}),

		/**
		 * next, find node.gyp and add nexe as a native lib file
		 */

		on.success(function() {
			fs.readFile(nodegypPath, "utf8", this);
		}),

		/**
		 * finally, monkeypatch node.gyp
		 */

		on.success(function(content) {

			//nexe already included as dep?
			if(~content.indexOf('lib/nexe.js')) return this();

			fs.writeFile(nodegypPath,
			content.replace("'lib/fs.js',", "'lib/fs.js', 'lib/nexe.js', "),
			"utf8",
			this);
		}),

		/**
		 */

		next
	);
}
