var Router = require('./router'),
PushRequest = require('./request');

exports.types = ['push'];

exports.test = function(expr)
{
	return expr.type == 'push' ? 'push' : null;
}

exports.newRouter = function()
{
	return new Router({ multi: true, RequestClass: PushRequest });
}