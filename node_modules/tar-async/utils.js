(function () {
	"use strict";

	function clean(length) {
		var i, buffer = new Buffer(length);
		for (i = 0; i < length; i += 1) {
			buffer[i] = 0;
		}
		return buffer;
	}

	function pad(num, bytes, base) {
		num = num.toString(base || 8);
		return "000000000000".substr(num.length + 12 - bytes) + num;
	}	
	
	module.exports.clean = clean;
	module.exports.pad = pad;
}());
