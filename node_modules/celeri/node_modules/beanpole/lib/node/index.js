require('sk/node/log');

//need this for global beanpole ~ not cached with NPM.
if(global.beanpole)
{
	module.exports = global.beanpole;
}
else
{
	var Loader = require('./loader');

	exports.router = function()
	{
		return new Loader();
	}


	exports.router().copyTo(module.exports, true);

	global.beanpole = module.exports;
}