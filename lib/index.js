var sardines = require('sardines'),
child_process = require('child_process'),
spawn = child_process.spawn,
exec = child_process.exec,
fs = require('fs'),
mkdirp = require('mkdirp'),
http = require('http'),
celeri = require('celeri');

const ETC_DIR = '/usr/local/etc/nexe';
const RUNTIMES_DIR = ETC_DIR + '/runtimes';
const CURRENT_RUNTIME_DIR = ETC_DIR + '/current-runtime';


/**
 */

function fileExists(file) {
	try {
		return !!fs.lstatSync(file);
	} catch(e) {
		return false;
	}
}

/**
 * modify the input node.js file to evaluate nexe
 */

function wrapNode(path) {

	var nodePath = path + '/src/node.js',
	content = fs.readFileSync(nodePath,'utf8');

	content = content.replace(/\(function\(process\) \{/,'(function(process){ \n process._eval = require("nexe"); ');

	fs.writeFileSync(nodePath, content);
}

/**
 */

function nexeMain(path) {
	var pkgPath = path + '/package.json';

	if(!fileExists(pkgPath)) return null;

	var script = JSON.parse(fs.readFileSync(pkgPath,'utf8'))['nexe-main'];

	return script ? fs.realpathSync(path+'/' + script) : null;
}

/**
 */

function prepare(version, callback) {

	var runtimeDir = 'node-v' + version,
	runtimeDirPath = RUNTIMES_DIR + '/' + runtimeDir,
	runtimeTarPath = RUNTIMES_DIR + '/'+ runtimeDir + '.tar';

	function onComplete() {
		callback(false, {
			path: runtimeDirPath,
			libDir: runtimeDirPath + '/lib'
		});
	}

	//file exists? already prepared
	if(fileExists(runtimeDirPath)) return onComplete();


	mkdirp(runtimeDirPath, 0755, function(err) {
	
		if(err) return callback(err);


		//download the node.js runtime if it doesn't exist
		http.get({ host: 'nodejs.org', port: 80, path: '/dist/v' + version + '/node-v' + version + '.tar.gz' }, function(res) {

			res.setEncoding('binary');
					
				var output = fs.createWriteStream(runtimeTarPath, { 'flags': 'a' }),
					size = Number(res.headers['content-length'] || 0),
					progress = 0;

				res.on('data', function(chunk) {
					progress += chunk.length;
					celeri.progress('Downloading ' + runtimeDir, Math.floor(progress/size * 100));
					output.write(chunk, 'binary');
				});

				res.on('end', function() {

					output.end();


					function onUnzipped(err) {

						fs.unlinkSync(runtimeTarPath);
						if(err) return callback(err);

						wrapNode(runtimeDirPath);

						onComplete();
					}

					console.log('Configuring %s', runtimeDirPath);
					exec('tar -xf ' + runtimeTarPath + '; cd ' + runtimeDirPath + '; ./configure', { cwd: RUNTIMES_DIR }, onUnzipped);
				});




		}).on('error', function(e) {

			try {
				fs.rmdirSync(runtimeDirPath);
			} catch(e) { }

			callback(new Error('Unable to download node '+version+': '+e.message));
		});


	});

	
}

/**
 */

function findIncludes(dir, inc) {

	if(!inc) inc = [];
		
	fs.readdirSync(dir).forEach(function(name) {
		
		if(name.substr(0,1) == '.' || name == 'node_modules') return;

		var subPath = dir + '/' + name;

		if(fs.statSync(subPath).isDirectory()) {

			findIncludes(subPath, inc);

		} else if(name.match(/\.js$/)) {

			inc.push(subPath);
		}
	});

	return inc;
}

/**
 */

exports.compile = function(ops, callback) {

	if(!ops.entries) throw new Error('You must provide entry javascript files.');
	if(!ops.runtime) throw new Error('A node.js runtime version must be provided.');
	if(!ops.output) throw new Error('Output must be provided.');


	ops.output = ops.output.replace('~', process.env.HOME);

	prepare(ops.runtime, function(err, node) {
		
		if(err) return callback(err);

		var include = [],
		entries = [];

		ops.entries.forEach(function(entry) {

			var main = nexeMain(entry);

			if(main) {

				findIncludes(entry).forEach(function(path) {
					
					include.push({
						script: path,
						alias: path.replace(entry,'')
					});

				});

				entries.push(main);
			} else {

				entries.push(entry);
			}


		});


		//combine the JS
		sardines.package({ input: entries, include: include, output: node.libDir + '/nexe.js' }, function(err) {

			if(err) return callback(new Error('Unable to make nexe.js'));

			console.log('Making executable');


			var proc = spawn('make', [], { cwd: node.path });

			proc.stdout.on('data', function(data) {
				console.log(data.toString());
			});

			proc.stderr.on('data', function(data) {
				console.error(data.toString());
			});

			proc.on('exit', function() {
				exec('cp ./out/Release/node ' + ops.output, { cwd: node.path }, callback);
			});


		});	

		
	});
}