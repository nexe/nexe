(function () {
	"use strict";

	var Stream = require('stream').Stream,
		headerFormat = require('./header').structure,
		buffer,
		totalRead = 0,
		recordSize = 512,
		fileStream,
		leftToRead,
		fileTypes = [
			'normal', 'hard-link', 'symbolic-link', 'character-special', 'block-special', 'directory', 'fifo', 'contiguous-file'
		];

	function filterDecoder(input) {
		var filter = [];
		if (!input) {
			return [0, 7];
		}

		if (typeof input === 'string') {
			input = [].push(input);
		}

		if (!(input instanceof Array)) {
			console.error('Invalid fileType. Only Arrays or strings are accepted');
			return;
		}

		input.forEach(function (i) {
			var index = fileTypes.indexOf(i);
			if (index < 0) {
				console.error('Filetype not valid. Ignoring input:', i);
				return;
			}

			filter.push(i);
		});

		return filter;
	}

	function readInt(value) {
		return parseInt(value.replace(/^0*/, ''), 8) || 0;
	}

	function readString(buf) {
		var i, length;
		for (i = 0, length = buf.length; i < buf.length; i += 1) {
			if (buf[i] === 0) {
				return buf.toString('utf8', 0, i);
			}
		}
	}

	function doHeader(buf, cb) {
		var data = {}, offset = 0, checksum = 0;

		function updateChecksum(value) {
			var i, length;

			for (i = 0, length = value.length; i < length; i += 1) {
				checksum += value.charCodeAt(i);
			}
		}

		headerFormat.some(function (field) {
			var tBuf = buf.slice(offset, offset + field.length),
				tString = tBuf.toString();

			offset += field.length;

			if (field.field === 'ustar' && !/ustar/.test(tString)) {
				// end the loop if not using the extended header
				return true;
			} else if (field.field === 'checksum') {
				updateChecksum('        ');
			} else {
				updateChecksum(tString);
			}

			if (field.type === 'string') {
				data[field.field] = readString(tBuf);
			} else if (field.type === 'number') {
				data[field.field] = readInt(tString);
			}
		});

		if (typeof cb === 'function') {
			if (checksum !== data.checksum) {
				return cb.call(this, 'Checksum not equal', checksum, data.checksum);
			}
			cb.call(this, null, data, recordSize);
		}
	}

	/*
	 * Extract data from an input.
	 * 
	 * @param opts- object of options
	 * @param cb- callback for each file
	 */
	function Untar(opts, cb) {
		if (typeof opts === 'function') {
			cb = opts;
			opts = {};
		}

		// I should probably actually add some options...
		opts = opts || {};

		this.fileTypes = filterDecoder(opts.filter);

		this.cb = cb;
	}

	Untar.prototype = Object.create(Stream.prototype, {
		constructor: {
			value: Untar
		}
	});

	Untar.prototype.end = function (data, encoding) {
		if (data) {
			this.write(data, encoding);
		}
	};

	Untar.prototype.write = function write(data, encoding) {
		var buf, tBuf, bytesBuffer;

		// get a Buffer object
		if (typeof data === 'string') {
			buf = new Buffer(data, encoding);
		} else if (typeof data === 'array') {
			buf = new Buffer(data);
		} else {
			buf = data;
		}

		if (!buf) {
			tBuf = buffer;
		} else if (buffer) {
			// create new buffer with old and new data
			tBuf = new Buffer(buffer.length + buf.length);
			buffer.copy(tBuf);
			buf.copy(tBuf, buffer.length);
		} else {
			tBuf = buf;
		}

		// clear old buffer
		buffer = undefined;

		// nothing to do, just give up ='(
		if (!tBuf || tBuf.length === 0) {
			return;
		}

		// stream the file
		if (fileStream) {
			if (tBuf.length >= leftToRead) {
				fileStream.emit('data', tBuf.slice(0, leftToRead));
				fileStream.emit('end');
				fileStream = undefined;

				buffer = tBuf.slice(leftToRead);
				totalRead += leftToRead;
				leftToRead = 0;
				return;
			}

			fileStream.emit('data', tBuf);
			leftToRead -= tBuf.length;
			totalRead += tBuf.length;
			return;
		}

		// no file to read, so let's try reading a header

		// if we're not an even multiple, account for trailing nulls
		if (totalRead % recordSize) {
			bytesBuffer = recordSize - (totalRead % recordSize);

			// if we don't have enough bytes to account for the nulls
			if (tBuf.length < bytesBuffer) {
				totalRead += bytesBuffer;
				return;
			}

			// throw away trailing nulls
			tBuf = tBuf.slice(bytesBuffer);
			totalRead += bytesBuffer;
		}

		// if we don't have enough for a full header, wait 'til we do...
		if (tBuf.length < recordSize) {
			buffer = tBuf;
			return;
		}

		doHeader.call(this, tBuf, function (err, data, rOffset) {
			if (err) {
				if (rOffset === 0) {
					return;
				}
				return this.cb(err);
			}

			// update total; rOffset should always be 512
			totalRead += rOffset;
			buffer = tBuf.slice(rOffset);

			fileStream = new Stream();

			if (this.fileTypes.indexOf(data.type) >= 0) {
				// we'll let the user know if they want this type of file
				this.cb(err, data, fileStream);
			}

			if (buffer.length >= data.size) {
				fileStream.emit('data', buffer.slice(0, data.size));
				fileStream.emit('end');
				totalRead += data.size;
				buffer = buffer.slice(data.size);

				fileStream = undefined;

				// recurse, we still have data
				return write.call(this);
			}

			leftToRead = data.size - buffer.length;
			fileStream.emit('data', buffer);
			totalRead += buffer.length;

			buffer = undefined;
		});
	};

	Untar.prototype.writable = true;

	module.exports = Untar;
}());
