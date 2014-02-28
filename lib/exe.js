var async     = require("async"),
outcome       = require("outcome"),
mkdirp        = require("mkdirp"),
request       = require("request"),
path          = require("path"),
fs            = require("fs"),
ncp           = require("ncp").ncp,
ProgressBar   = require("progress"),
child_process = require("child_process"),
glob          = require("glob"),
sardines      = require("sardines"),
spawn         = child_process.spawn;

/**
 */

exports.compile = function (options, complete) {

	var nodeCompiler, nexeEntryPath;

	async.waterfall([

		/**
		 * first download node
		 */

		function downloadNode (next) {
			_downloadNode(options.nodeVersion, "/tmp/nexe", next);
		},

		/**
		 * bundle the application into one script
		 */

		function combineProject (nc, next) {
			nodeCompiler = nc;
			_log("bundle %s", options.input);
			sardines({ entries: [options.input], platform: "node" }, next);
		},

		/**
		 * write the bundle to the lib directory of the target node version
		 */

		function writeBundle (source, next) {
			bundlePath = path.join(nodeCompiler.dir, "lib", "nexe.js");
			_log("bundle -> %s", bundlePath);
			fs.writeFile(bundlePath, source, next);
		},

		/**
		 * monkeypatch some files so that the nexe.js file is loaded when the app runs
		 */

		function monkeyPatchNodeConfig (next) {
			_monkeyPatchNodeConfig(nodeCompiler, next);
		},

		/**
		 * compile the node application
		 */

		function makeExe (next) {
			_log("make");
			nodeCompiler.make(next);
		},

		/**
		 */

		function makeOutputDirectory (next) {
			mkdirp(path.dirname(options.output), function(){ next(); });
		},

		/**
		 */

		function copyBinaryToOutput (next) {
			_log("cp %s %s", nodeCompiler.releasePath, options.output);
			ncp(nodeCompiler.releasePath, options.output, next);
		}
	], complete);
}

/**
 */

function _downloadNode (version, directory, complete) {

	var nodeFileDir = path.join(directory, version),
	nodeFilePath    = path.join(nodeFileDir, "node-" + version + ".tar.gz");


	// might already be downloaded, and unzipped
	if (_getNodeCompiler(nodeFileDir, complete)) {
		return;
	}


	async.waterfall([

		/**
		 * first make the directory where the zip file will live
		 */

		function makeDirectory (next) {
			mkdirp(path.dirname(nodeFilePath), function () { next(); })
		},

		/**
		 * download node into the target directory
		 */

		function downloadNode (next) {

			if (fs.existsSync(nodeFilePath)) return next();

			var url, prefix = "http://nodejs.org/dist";

			// pick which url depending on the version
			if (version === "latest") {
				url = prefix + "/node-" + version + ".tar.gz";
			} else {
				url = prefix + "/v" + version + "/node-v" + version + ".tar.gz";
			}

			_log("downloading %s", url);

			var output = fs.createWriteStream(nodeFilePath, { "flags": "w+" });

			_logProgress(request(url)).pipe(output);

			output.on("close", function () { next(); });
		},

		/**
		 * unzip in the same directory
		 */

		function unzipNodeTarball (next) {

			var cmd = ["tar", "-xf", nodeFilePath, "-C", nodeFileDir];
			_log(cmd.join(" "));

			var tar = spawn(cmd.shift(), cmd);
			tar.stdout.pipe(process.stdout);
			tar.stderr.pipe(process.stderr);

			tar.on("close", function () { next(); })
		},

		/**
		 * return the compiler object for the node version
		 */

		function (next) {
			_getNodeCompiler(nodeFileDir, next)
		},

	], complete);
}

/**
 */

function _getNodeCompiler (nodeFileDir, complete) {
	var dir = _getFirstDirectory(nodeFileDir);

	if (dir) {
		complete(null, {
			dir: dir,
			version: path.basename(nodeFileDir),
			releasePath: path.join(dir, "out", "Release", "node"),
			make: function (next) {
				var configure = spawn("./configure", [], { cwd: dir });
				configure.stdout.pipe(process.stdout);
				configure.stderr.pipe(process.stderr);
				configure.on("close", function () {
					var make = spawn("make", [], { cwd: dir });
					make.stdout.pipe(process.stdout);
					make.stderr.pipe(process.stderr);
					make.on("close", function () {
						next();
					});
				})
			}
		});
		return true;
	}

	return false;
}

/**
 */

function _monkeyPatchNodeConfig (compiler, complete) {
	async.waterfall([

		/**
		 * monkeypatch the gyp file to include the nexe.js file
		 */

		function (next) {
			_monkeyPatchGyp(compiler, next)
		},

		/**
		 * monkeypatch main entry point 
		 */

		function (next) {
			_monkeyPatchMainJs(compiler, next)
		}
	], complete);
}

/**
 */

function _monkeyPatchGyp (compiler, complete) {

	var gypPath = path.join(compiler.dir, "node.gyp");

	_monkeypatch(
		gypPath, 
		function (content) {
			return ~content.indexOf("nexe.js");
		},
		function (content, next) {
			next(null, content.replace("'lib/fs.js',", "'lib/fs.js', 'lib/nexe.js', "))
		},
		complete
	)
}

/**
 */

function _monkeyPatchMainJs (compiler, complete) {
	var mainPath = path.join(compiler.dir, "src", "node.js");

	_monkeypatch(
		mainPath, 
		function (content) {
			return ~content.indexOf("nexe");
		},
		function (content, next) {
			next(null, content.replace(/\(function\(process\) \{/,'(function(process) {\n  process._eval = \'require("nexe");\';\n  process.argv.unshift("node");\n'))
		},
		complete
	);
}

/**
 */

function _monkeypatch (filePath, monkeyPatched, processor, complete) {

	async.waterfall([

		function read (next) {
			fs.readFile(filePath, "utf8", next);
		},

		// TODO - need to parse gyp file - this is a bit hacker
		function monkeypatch (content, next) {

			if (monkeyPatched(content)) return complete();

			_log("monkey patch %s", filePath);
			processor(content, next);
		},

		function write (content, next) {
			fs.writeFile(filePath, content, "utf8", next);
		}
	], complete);
}


/**
 */

function _getFirstDirectory (dir) {
	var files = glob.sync(dir + "/*");

	for (var i = files.length; i--;) {
		var file = files[i];
		if (fs.statSync(file).isDirectory()) return file;
	}

	return false;
}

/**
 */

function _logProgress (req) {

	req.on("response", function (resp) {

		var len = parseInt(resp.headers["content-length"], 10),
		bar     = new ProgressBar("[:bar]", { 
			complete: "=", 
			incomplete: " ", 
			total: len,
			width: process.stdout.columns - 2
		});

		req.on("data", function (chunk) {
			bar.tick(chunk.length);
		});
	});

	return req;
}

/**
 */

function _log () {

	var args = Array.prototype.slice.call(arguments, 0),
	level = args.shift();

	if (!~["log", "error", "warn"].indexOf(level)) {
		args.unshift(level);
		level = "log";
	}

	args[0] = "----> " + args[0];

	console[level].apply(console, args);
}