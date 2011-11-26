var Router = require('../../../../concrete/router'),
Request = require('./request');

exports.types = ['pull','pullMulti'];

exports.test = function(expr)
{
	if(expr.type == 'pullMulti') return 'pullMulti';
	return expr.type == 'pull' ? (expr.meta && expr.meta.multi ? 'pullMulti' : 'pull') : null;
}

exports.newRouter = function(type)
{
	var ops = { RequestClass: Request };

	if(type == 'pullMulti') ops.multi = true;

	return new Router(ops);
}