(function () {
	"use strict";

	var path = require('path'),
		Stream = require('stream').Stream,
		header = require("./header"),
		utils = require("./utils"),
		recordSize = 512,
		blockSize,
		queue = [];
	
	function Tar(opt) {
		var tape;

		opt = opt || {};

		blockSize = (opt.recordsPerBlock ? opt.recordsPerBlock : 20) * recordSize;

		Stream.apply(this, arguments);

		tape = this;

		this.written = 0;

		this.consolidate = 'consolidate' in opt ? opt.consolidate : false;
		this.normalize = 'normalize' in opt ? opt.normalize : true;

		this.on('end', function () {
			tape.emit('data', utils.clean(blockSize - (tape.written % blockSize)));
		});

		if (opt && opt.output) {
			this.pipe(opt.output);
		}
	}

	Tar.prototype = Object.create(Stream.prototype, {
		constructor: { value: Tar }
	});

	Tar.prototype.close = function () {
		this.emit('end');
	};

	Tar.prototype.append = function (filepath, input, opts, callback) {
		var data,
			checksum,
			mode,
			mtime,
			uid,
			gid,
			size,
			tape = this,
			extraBytes,
			headerBuf;

		if (typeof opts === 'function') {
			callback = opts;
			opts = {};
		}

		if (this.processing || queue.length) {
			queue.push({
				filepath: filepath,
				input: input,
				opts: opts,
				cb: callback
			});
			return;
		}

		opts = opts || {};

		mode = opts.mode || parseInt('777', 8) & 0xfff;
		mtime = opts.mtime || parseInt(+new Date() / 1000);
		uid = opts.uid || 0;
		gid = opts.gid || 0;
		size = opts.size || input.length;

		data = {
			filename: this.consolidate ? path.basename(filepath) : filepath,
			mode: utils.pad(mode, 7),
			uid: utils.pad(uid, 7),
			gid: utils.pad(gid, 7),
			size: utils.pad(size, 11),
			mtime: utils.pad(mtime, 11),
			checksum: '        ',
			type: '0', // just a file
			ustar: 'ustar  ',
			owner: '',
			group: ''
		};

		if (this.normalize && !this.consolidate) {
			data.filename = path.normalize(data.filename);
		}

		// calculate the checksum
		checksum = 0;
		Object.keys(data).forEach(function (key) {
			var i, value = data[key], length;

			for (i = 0, length = value.length; i < length; i += 1) {
				checksum += value.charCodeAt(i);
			}
		});

		data.checksum = utils.pad(checksum, 6) + "\u0000 ";

		headerBuf = header.format(data);
		this.emit('data', header.format(data));
		this.written += headerBuf.length;

		if (typeof input === 'string') {
			this.emit('data', input);
			this.written += input.length;

			extraBytes = recordSize - (size % recordSize || recordSize);
			this.emit('data', utils.clean(recordSize - (size % recordSize)));
			this.written += extraBytes;

			if (typeof callback === 'function') {
				callback();
			}
		} else {
			this.processing = true;

			input.on('data', function (chunk) {
				tape.emit('data', chunk);
				tape.written += chunk.length;
			});

			input.on('end', function () {
				extraBytes = recordSize - (size % recordSize || recordSize);
				tape.emit('data', utils.clean(extraBytes));
				tape.written += extraBytes;

				if (queue.length) {
					setTimeout(function () {
						var elem = queue.splice(0, 1)[0];

						tape.append(elem.filepath, elem.input, elem.opts, elem.cb);
					}, 0);

					tape.processing = false;
				}

				if (typeof callback === 'function') {
					callback();
				}
			});
		}
	};
	
	module.exports = Tar;
}());
