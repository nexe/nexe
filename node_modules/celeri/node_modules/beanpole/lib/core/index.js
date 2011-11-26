var Loader = require('./loader');


//or a new, sandboxed router
exports.router = function()
{
	return new Loader();
}

//singleton to boot
exports.router().copyTo(module.exports, true);
