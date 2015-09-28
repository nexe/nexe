/**
 * Copyright (c) 2013 Craig Condon
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 **/
var async         = require("async"),
    outcome       = require("outcome"),
    mkdirp        = require("mkdirp"),
    request       = require("request"),
    path          = require("path"),
    fs            = require("fs"),
    ncp           = require("ncp").ncp,
    ProgressBar   = require("progress"),
    child_process = require("child_process"),
    glob          = require("glob"),
    bundle        = require("./bundle"),
    embed         = require("./embed"),
    os            = require("os"),
    targz         = require('tar.gz'),
    _log          = require("./log"),
    _monkeypatch  = require("./monkeypatch"),
    spawn         = child_process.spawn;

var isWin = /^win/.test(process.platform);
var isPy;
var framework;
var version;

var option_list = [
	"python",
	"input",
	"output",
	"nodeTempDir",
	"flags",
	"framework",
	"nodeVersion"
]

/**
 * Compiliation process.
 */

exports.compile = function (options, complete) {

	var nodeCompiler, nexeEntryPath;

	async.waterfall([
		/**
		 *check relevant options
		 */
		function checkOpts (next) {
			/* failsafe */
			if(options === undefined) {
				_log("error", "no options given to .compile()");
				process.exit()
			}

			option_list.forEach(function(v) {
				if(options[v] === undefined) {
					_log("error", "option "+v+" was empty")
					process.exit();
				}
			});

            /**
             * Have we been given a custom flag for python executable?
			 **/
			if(options.python!=='python' && options.python!==""
             && options.python!==undefined) {
				if(isWin) {
					isPy=options.python.replace(/\//gm, "\\"); // use windows file paths, batch is sensitive.
				} else {
					isPy=options.python;
				}

				_log("set python as "+isPy);
			} else {
				isPy="python";
			}

			// remove dots
			options.framework = options.framework.replace(/\./g, "");

			// set outter-scope framework variable.
			framework = options.framework;
			_log("framework => "+framework);

			version = options.nodeVersion; // better framework vc

			// check iojs version
			if (framework === "iojs" && version === "latest" ) {
				_log("fetching iojs versions");
				mkdirp(options.nodeTempDir); // make temp dir, probably repetive.

				// create write stream so we have control over events
				var output = fs.createWriteStream(path.join(options.nodeTempDir,
					"iojs-versions.json"));

				request.get("https://iojs.org/dist/index.json")
				.pipe(output);

				output.on('close', function() {
					_log("done");
					var f = fs.readFileSync(path.join(options.nodeTempDir,
						"iojs-versions.json"));
					f = JSON.parse(f);
					version = f[0].version.replace("v", "");

					_log("iojs latest => "+version);

					// continue down along the async road
					next();
				})
			} else {
				next();
			}
		},

		/**
		 * first download node
		 */
		function downloadNode (next) {
			_downloadNode(version, options.nodeTempDir, next);
		},

		/**
		 * bundle the application into one script
		 */

		function combineProject (nc, next) {
			nodeCompiler = nc;
			_log("bundle %s", options.input);
			bundle(options.input, nodeCompiler.dir, next);
		},

		function embedResources(next) {
			_log("embedResources %s", options.resourceFiles);
			embed(options.resourceFiles, options.resourceRoot, next);
		},

		function writeResources (resources, next) {
			resourcePath = path.join(nodeCompiler.dir, "lib", "nexeres.js");
			_log("resource -> %s", resourcePath);

			fs.writeFile(resourcePath, resources, next);
		},

		/**
		 * monkeypatch some files so that the nexe.js file is loaded when the app runs
		 */

		function monkeyPatchNodeConfig (next) {
			_monkeyPatchNodeConfig(nodeCompiler, next);
		},

		/**
		 * monkeypatch node.cc to prevent v8 and node from processing CLI flags
		 */
		function monkeyPatchNodeCc (next) {
			if (options.flags) {
				_monkeyPatchMainCc(nodeCompiler, next);
			} else {
				next();
			}
		},

		/**
		 * monkeypatch child_process.js so nexejs knows when it is a forked process
		 */
		function monkeyPatchChildProc(next) {
			_monkeyPatchChildProcess(nodeCompiler, next);
		},

		/**
		 * If an old compiled executable exists in the Release directory, delete it.
		 * This lets us see if the build failed by checking the existence of this file later.
		 */

		function cleanUpOldExecutable (next) {
			fs.unlink(nodeCompiler.releasePath, function (err) {
				if (err) {
					if (err.code === "ENOENT") {
						next();
					} else {
						throw err;
					}
				} else {
					next();
				}
			});
		},

		/**
		 * compile the node application
		 */

		function makeExecutable (next) {
			if(isWin) {
				_log("vcbuild [make stage]");
			} else {
				_log("make");
			}
			nodeCompiler.make(next);
		},

		/**
		 * we create the output directory if needed
		 */

		function makeOutputDirectory (next) {
			mkdirp(path.dirname(options.output), function(){ next(); });
		},

		/**
		 * Verify that the executable was compiled successfully
		 */

		function checkThatExecutableExists (next) {
			fs.access(nodeCompiler.releasePath, function (err) {
				if (err) {
					_log("error",
						"The release executable has not been generated. " +
						"This indicates a failure in the build process. " +
						"There is likely additional information above."
					);
					throw new Error("The release executable was not built ('" + nodeCompiler.releasePath + "')");
				} else {
					next();
				}
			});
		},

		/**
		 * Copy the compilied binary to the output specified.
		 */

		function copyBinaryToOutput (next) {
			_log("cp %s %s", nodeCompiler.releasePath, options.output);
			ncp(nodeCompiler.releasePath, options.output, function (err) {
				if (err) {
					_log("error", "Couldn't copy binary.");
					throw err; // dump raw error object
				}
				_log('copied');

				next();
			});
		}
	], complete);
}

/**
 * Download a version of node
 *
 * @param {string} version, version of node to download
 * @param {string} directory, where to store the downloaded src
 * @param {function} complete, callback
 */

function _downloadNode (version, directory, complete) {

	var nodeFileDir = path.resolve(path.join(directory, framework, version)), // fixes #107, was process.cwd(), + rest.
	nodeFilePath    = path.resolve(path.join(nodeFileDir, framework + "-" + version + ".tar.gz"));


	// might already be downloaded, and unzipped
	if (_getNodeCompiler(nodeFileDir, complete)) {
		return;
	}


	async.waterfall([

		/**
		 * first make the directory where the zip file will live
		 */

		function makeDirectory (next) {
			mkdirp.sync(path.dirname(nodeFilePath));
			next();
		},

		/**
		 * download node into the target directory
		 */

		function downloadNode (next) {
			if (fs.existsSync(nodeFilePath)) return next();

			var type = global.type;
			var url, prefix = "https://"+framework+".org/dist";

			// pick which url depending on the version
			if(framework==="nodejs") framework = "node"; // cmon node why can't you stay the same

			if (version === "latest") {
				url = prefix + "/" + framework + "-" + version + ".tar.gz";
			} else {
				url = prefix + "/v" + version + "/"+framework+"-v" + version + ".tar.gz";
			}

			_log("downloading %s", url);

			var output = fs.createWriteStream(nodeFilePath, { "flags": "w+" });

			// need to set user-agent to bypass some corporate firewalls
			var requestOptions = {
				url: url,
				headers: {
					"User-Agent": "Node.js"
				}
			}

			_logProgress(request(requestOptions)).pipe(output);

			output.on("close", function () { next(); });
		},

		/**
		 * unzip in the same directory
		 */

		function unzipNodeTarball (next) {
			if(isWin) {
				_log("Extracting the .tar.gz.");
				new targz().extract(nodeFilePath, nodeFileDir, next);
			} else {
				var cmd = ["tar", "-xf", nodeFilePath, "-C", nodeFileDir];
				_log(cmd.join(" "));

				var tar = spawn(cmd.shift(), cmd);
				tar.stdout.pipe(process.stdout);
				tar.stderr.pipe(process.stderr);

				tar.on("close", function () { next(); })
			}
		},

		/**
		 * return the compiler object for the node version
		 */

		function (next, type) {
			_getNodeCompiler(nodeFileDir, next, type)
		},

	], complete);
}

/**
 * Get the compilier we will use for whatever platform we may be on and configure
 * it.
 */

function _getNodeCompiler (nodeFileDir, complete, type) {
	var dir = _getFirstDirectory(nodeFileDir);

	// standard
	var executable = "node.exe";
	var binary     = "node";

	// iojs specifics.
	if(framework === "iojs") {
		executable = "iojs.exe";
		binary = "iojs";
	}

	if (dir) {
		if(isWin) {
			complete(null, {
				dir: dir,
				version: path.basename(nodeFileDir),
				releasePath: path.join(dir, "Release", executable),
				make: function(next) {
					// create a new env with minimal impact on old one
					var newEnv = process.env

					if(isPy!=="python") {
						// add the dir of the suposed python exe to path
						newEnv.path = process.env.PATH+";"+path.dirname(isPy)
					}

					// spawn a vcbuild process with our custom enviroment.
					var vcbuild = spawn("vcbuild.bat", ["nosign", "release"], {
						cwd: dir,
						env: newEnv
					});
					vcbuild.stdout.pipe(process.stdout);
					vcbuild.stderr.pipe(process.stderr);
					vcbuild.on("close", function() {
						next();
					});
				}
			});
		} else {
			complete(null, {
				dir: dir,
				version: path.basename(nodeFileDir),
				releasePath: path.join(dir, "out", "Release", binary),
				make: function (next) {
					var cfg = "./configure", configure;
					if(isPy !== "python") {
						configure = spawn(isPy, [cfg], { cwd: dir });
					} else {
						configure = spawn(cfg, [], { cwd: dir });
					}

					// local function, move to top eventually
					function _loop(dir) {
						/* eventually try every python file */
						var pdir = fs.readdirSync(dir);

						pdir.forEach(function(v, i) {
							var stat = fs.statSync(dir+"/"+v);
							if(stat.isFile()) {
								// only process Makefiles and .mk targets.
								if(v !== "Makefile" && path.extname(v) !== ".mk") {
									return;
								}

								_log("patching "+v);

								/* patch the file */
								var py = fs.readFileSync(dir+"/"+v, {encoding: 'utf8'});
								py = py.replace(/([a-z]|\/)*python(\w|)/gm, isPy); // this is definently needed
								fs.writeFileSync(dir+"/"+v, py, {encoding: 'utf8'}); // write to file

								delete pv;
							} else if(stat.isDirectory()) {
								// must be dir?
								// skip tests because we don't need them here
								if(v !== "test") {
									_loop(dir+"/"+v)
								}
							}
						});
					}

					configure.stdout.pipe(process.stdout);
					configure.stderr.pipe(process.stderr);
					configure.on("close", function () {
						if(isPy !== "python") {
						  /**
							 * Originally I thought this only applied to io.js,
							 * however I soon found out this affects node.js,
							 * so it is now mainstream.
							 */
							_log("preparing python");

							// loop over depends
							_loop(dir);
						}
						var platformMake = "make";
						if (os.platform().match(/bsd$/) != null) {
							platformMake = "gmake";
						}
						var make = spawn(platformMake, [], { cwd: dir });
						make.stdout.pipe(process.stdout);
						make.stderr.pipe(process.stderr);
						make.on("close", function () {
							next();
						});
					})
				}
			});
		}
		return true;
	}

	return false;
}

/**
 */

function _monkeyPatchNodeConfig (compiler, complete) {
	async.waterfall([
		/**
		 * monkeypatch the gyp file to include the nexe.js and nexeres.js files
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
 * patch the gyp file to allow our custom includes
 */

function _monkeyPatchGyp (compiler, complete) {

	var gypPath = path.join(compiler.dir, "node.gyp");

	_monkeypatch(
		gypPath,
		function (content) {
			return ~content.indexOf("nexe.js");
		},
		function (content, next) {
			next(null, content.replace("'lib/fs.js',", "'lib/fs.js', 'lib/nexe.js', 'lib/nexeres.js', "))
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
			next(null, content.replace(/\(function\(process\) \{/,'(function(process) {\n  process._eval = \'require("nexe");\';\n  process.argv.splice(1, 0, "nexe.js");\n'))
		},
		complete
	);
}

/**
 */
function _monkeyPatchChildProcess(compiler, complete) {
    var childProcPath = path.join(compiler.dir, "lib", "child_process.js");

    _monkeypatch(
        childProcPath,
        function (content) {
            return ~content.indexOf("--child_process");
        },
        function (content, next) {
            next(null, content.replace(/return spawn\(/, 'args.unshift("--child_process");\n  return spawn('));
        },
        complete
    );
}

/**
 * Patch node.cc to not check the internal arguments.
 */

function _monkeyPatchMainCc(compiler, complete) {
	var mainPath = path.join(compiler.dir, "src", "node.cc");
	_monkeypatch(
		mainPath,
		function (content) {
			return ~content.indexOf('//  // TODO use parse opts');
		},
		function (content, next) {
			var lines = content.split('\n');
			var endLine = lines.indexOf('  option_end_index = i;'); // pre node 0.11.6 compat

			if(endLine !== -1) { // check if it succedded or not.
			  lines[endLine] = '  option_end_index = 1;';
			  _log("patched node.cc")
			}

			/**
			 * This is the new method of passing the args. Tested on node.js 0.12.5
			 * and iojs 2.3.1
			 **/
			if(endLine === -1) { // only if the pre-0.12.5 failed.
        var startLine = lines.indexOf('  while (index < nargs && argv[index][0] == \'-\') {'); // beginning of the function
        endLine = lines.indexOf('  // Copy remaining arguments.');
        endLine = endLine-1; // space, then it's at the }

        // remove the offending lines
        if(startLine !== -1) {
          for (var i = startLine; i < endLine; i++) {
            lines[i] = undefined; // set the value to undefined so it's skipped by the join
          }
          _log('patched node.cc');
        }
			}

			lines = lines.join('\n');
			next(null, lines);
		},
		complete
	);
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
			width: ((isWin) ? 100 : process.stdout.columns - 2) // windows doesn't output colums correctly
		});

		req.on("data", function (chunk) {
			bar.tick(chunk.length);
		});
	});

	return req;
}

/**
 * Attempt to parse the package.json for nexe information.
 *
 * @param {string} path - path to package.json
 * @param {object} options - fallback options
 *
 * @todo implement options overriding package defaults.
 *
 * @return {object} nexe.compile options object
**/
exports.package = function(path, options) {
	var _package; // scope

	// check if the file exists
	if(fs.existsSync(path)===false) {
		_log("warn", "no package.json found.");
	} else {
		_package = require(path);
	}

	// replace ^$ w/ os specific extension on output
	if(isWin) {
		_package.nexe.output = _package.nexe.output.replace(/\^\$/, '.exe') // exe
	} else {
		_package.nexe.output = _package.nexe.output.replace(/\^\$/, '') // none
	}

	// construct the object
	var obj = {
		input: (_package.nexe.input || options.i),
		output: (_package.nexe.output || options.o),
		flags: (_package.nexe.runtime.ignoreFlags || options.f),
		resourceFiles: (_package.nexe.resourceFiles),
		nodeVersion: (_package.nexe.runtime.version || options.r),
		python: (_package.nexe.python || options.p),
		nodeTempDir: (_package.nexe.temp || options.t),
		framework: (_package.nexe.runtime.framework || options.f)
	}

	Object.keys(_package.nexe).forEach(function(v,i) {
		if(v!=="runtime") {
			_log("log", v+" => '"+_package.nexe[v]+"'");
		}
	});
	Object.keys(_package.nexe.runtime).forEach(function(v,i) {
		_log("log", "runtime."+v+" => '"+_package.nexe.runtime[v]+"'");
	});

	return obj;
}
