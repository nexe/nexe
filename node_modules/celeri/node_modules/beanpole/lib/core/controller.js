var Structr = require('structr'),
routeMiddleware = require('./middleware/route'),
metaMiddleware = require('./middleware/meta'),
Parser = require('./concrete/parser'),
Janitor = require('sk/core/garbage').Janitor,
utils = require('./concrete/utils');

var AbstractController = Structr({
	
	/**
	 */


	'__construct': function(target)
	{
		this.metaMiddleware = metaMiddleware(this);
		this.routeMiddleware = routeMiddleware(this);

		this.metaMiddleware.init();
		this.routeMiddleware.init();

		this._channels = {};
	},

	/**
	 */

	'has': function(type, ops)
	{
		var expr = this._parse(type, ops);
		return this._router(expr).hasRoutes(expr);
	},

	/**
	 */

	'getRoute': function(type, ops)
	{
		var expr = this._parse(type, ops);
		return this._router(expr).getRoute(utils.channel(expr, 0));
	},

	/**
	 */

	'on': function(target)
	{
		var ja = new Janitor();

		for(var type in target)
		{
			ja.addDisposable(this.on(type, {}, target[type]));
		}

		return ja;
	},

	/**
	 */

	'second on': function(type, callback)
	{
		return this.on(type, {}, callback);
	},

	/**
	 */

	'third on': function(type, ops, callback)
	{
		var expr = this._parse(type, ops),
		router = this.routeMiddleware.router(expr);

		for(var i = expr.channels.length; i--;)
		{
			var pathStr = utils.pathToString(expr.channels[i].paths);

			if(!this._channels[pathStr])
			{
				this.addChannel(pathStr, Structr.copy(utils.channel(expr, i)));
			}
		}
		
		return router.on(expr, ops, callback);
	},

	/**
	 */

	'channels': function()
	{
		return this._channels;
	},

	/**
	 */

	'addChannel': function(path, singleChannel)
	{
		for(var prop in singleChannel.meta)
		{
			singleChannel.meta[prop] = '*';
		}

		this._channels[path] = singleChannel;
	},

	/**
	 * flavor picker for operations. In the string, or in the ops ;)
	 */

	'_parse': function(type, ops)
	{
		var expr = typeof type != 'object' ? Parser.parse(type) : Structr.copy(type);
		
		if(ops)
		{
			if(ops.meta) Structr.copy(ops.meta, expr.meta);
			if(ops.type) expr.type = ops.type;
		}

		return expr;
	},

	/**
	 */

	'_router': function(expr)
	{
		return this.routeMiddleware.router(expr);
	},

	/**
	 */

	'_createTypeMethod': function(method)
	{
		var self = this;

		var func = this[ method ] = function(channel, data, ops, callback)
		{
			if(!ops) ops = {};
			ops.type = method;

			var expr = this._parse(channel, ops);

			return self._router(expr).dispatch(expr, data, ops, callback);
		}


		var router = self._router( { type: method });


		Structr.copy(router, func, true);

	}
});


var ConcreteController = AbstractController.extend({
	
	/**
	 */

	'override __construct': function()
	{
		this._super();

		var self = this;
		
		//make channels data-bindable
		this.on({
			
			/**
			 */

			'pull channels': function()
			{
				return self.channels();
			}
		});
	},

	/**
	 */

	'override addChannel': function(path, singleChannel)
	{
		this._super(path, singleChannel);

		//keep the same format as the channels so the end-point is handled exactly the same
		var toPush = {};

		toPush[path] = singleChannel;

		this.push('channels', toPush, { ignoreWarning: true });
	}
})

module.exports = ConcreteController;