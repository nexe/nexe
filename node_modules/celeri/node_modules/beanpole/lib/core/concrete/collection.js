var Structr = require('structr'),
Parser = require('./parser'),
utils = require('./utils'),
Request = require('./request'),
Janitor = require('sk/core/garbage').Janitor;





/**
 * collection for routes
 */

/**
 * IMPORTANT notes regarding this class
 * 1. you can have multiple explicit middleware (/path/*)
*/


var Collection = Structr({
	
	/**
	 * Constructor. What else do you think it is?
	 */

	'__construct': function(ops)
	{

		//the options for the router
		this._ops = ops || {};

		//these are the channels parsed into a traversable route
		this._routes = this._newRoute();

		//these get executed whenever there's a new "on"
		this._middleware = this._newRoute();

		//the current route index. increments on every route!
		this._routeIndex = 0;
	},

	/**
	 */

	'has': function(expr)
	{
		var routes = this.routes(expr);

		for(var i = routes.length; i--;)
		{
			if(routes[i].target) return true;
		}

		return false;
	},

	/**
	 */
	
	'route': function(channel)
	{
		return this._route(channel.paths);
	},

	/**
	 */

	'routes': function(expr)
	{
		var channels = expr.channels,
		routes = [];

		for(var i = channels.length; i--;)
		{
			routes.push(this.route(channels[i]));
		}

		return routes;
	},

	/**
	 * listens to the given expression for any chandage
	 */

	'add': function(expr, callback)
	{
		var janitor = new Janitor();

		for(var i = expr.channels.length; i--;)
		{
			janitor.addDisposable(this._add(expr.channels[i], expr.meta, callback));
		}



		return janitor;
	},

	/**
	 */

	'_add': function(channel, meta, callback)
	{
		var paths = channel.paths,
		isMiddleware = channel.isMiddleware,
		middleware = channel.thru,

		//middleware isn't used explicitly. Rather, it's *injected* into the routes which ARE used. Remember that.
		//explicit middleware looks like some/path/*
		currentRoute = this._start(paths, isMiddleware ? this._middleware : this._routes, true);

		//some explicit middleware might already be defined, so we need to get the *one* to pass through. 
		var before = this._before(paths, currentRoute);


		if(middleware) this._endMiddleware(middleware).thru = before;


		//the final callback for the route
		var listener = {
			callback: callback,

			//metadata for the expression
			meta: meta,

			//keeps tabs for later use (in request)
			id: 'r'+(this._routeIndex++),

			//this is a queue where the first item is executed first, then on until we reach the last item
			thru: middleware || before,

			isMiddleware: channel.isMiddleware,

			path: paths,

			dispose: function()
			{
				var i = currentRoute.listeners.indexOf(listener);
				if(i > -1) currentRoute.listeners.splice(i, 1);
			}
		};

		currentRoute.meta = Structr.copy(meta, currentRoute.meta);

		//at this point we can inject the listener into the current route IF it's middleware.
		if(isMiddleware) this._injectMiddleware(listener, paths);


		//now that we're in the clear, need to add the listener!
		if(!currentRoute.listeners) currentRoute.listeners = [];


		//now to add it. Please take remember, for MOST CASES, "_listeners" will only have one, especially for http / requests
		currentRoute.listeners.push(listener);



		//the return statement allows for the item to be disposed of
		return listener;
	},

	/**
	 */
	
	'_endMiddleware': function(target)
	{
		var current = target || {};

		while(current.thru)
		{
			current = current.thru;
		}

		return current;
	},

	/**
	 * injects explicit middleware (/path/*) in all the routes which go through its path
	 */

	'_injectMiddleware': function(listener, paths)
	{
		//level is only important for 
		listener.level = paths.length;

		//need to go through *all* routes ~ even middleware, because middleware also have 
		//routes to pass through ~ Inception.
		var afterListeners = this._after(paths, this._routes).concat(this._after(paths, this._middleware));

		//go through ALL items to put before this route, but make sure the item we're replacing isn't higher
		//in the middleware chain, because higher methods will already *have* reference to this pass-thru
		for(var i = afterListeners.length; i--;)
		{
			var currentListener = afterListeners[i];

			var currentMiddleware = currentListener.thru,
			previousMiddleware = currentListener;

			while(currentMiddleware)
			{
				if(currentMiddleware.level != undefined)
				{
					if(currentMiddleware.level < listener.level)
					{
						previousMiddleware.thru = listener;
					}
					break;
				}

				previousMiddleware = currentMiddleware;
				currentMiddleware = currentMiddleware.thru;
			}
			
			if(!currentMiddleware) previousMiddleware.thru = listener;
		}
	},

	/**
	 * reveals routes which must come *before* a middleware
	 * after beats circular references
	 * TODO: following code is __ugly as fuck__.
	 */

	'_before': function(paths, after)
	{
		var current = this._middleware,
		listeners = [];

		for(var i = 0, n = paths.length; i < n; i++)
		{

			//this makes sure we don't get to the end for pass thrus
			if(current.listeners) listeners = current.listeners;

            
			 var path = paths[i],

			 newCurrent = path.param ? current._route._param : current._route[path.name];
                                                  
			 
			 if(current == after || !newCurrent) break;

			 current = newCurrent;
		}


		 // if(current != after)
		 //this is a check against pass thrus to beat circular references. It *also* allows this: hello/* -> hello
		if(current != after && current.listeners) listeners = current.listeners;

		return listeners[0];
	},

	/**
	 * reveals everyhing that comes *after* a route (for pass-thru's)
	 */

	'_after': function(paths, routes)
	{
		return this._flatten(this._start(paths, routes));
	},

	/**
	 * returns the starting point of a route
	 */

	'_route': function(paths, routes, create, retControl)
	{
        var control = (routes || this._routes),
		current = control._route;

		for(var i = 0, n = paths.length; i < n; i++)
		{
			var path = paths[i],
			name = path.param ? '_param' : path.name;

			if(!current[name] && create)
			{
				current[name] = this._newRoute(i);
			}

			if(current[name])
			{
				current = current[name];
			}
			else
			{
				current = current._param;
			}


			if(!current) return {};
            
            control = current;
			current = current._route;
		}


		return control;
	},

	/**
	 */

	'_start': function(paths, routes)
	{
		return this._route(paths, routes, true);
	},

	/**
	 */

	'_newRoute': function(level)
	{
		return { _route: { }, _level: level || 0 };
	},

	/**
	 * flattens all routes into a single array
	 */

	'_flatten': function(route)
	{
		var listeners = route.listeners ? route.listeners.concat() : [];

		
		for(var path in route._route)
		{
			listeners = listeners.concat(this._flatten(route[path] || {}));
		}

		return listeners;
	}
});


module.exports = Collection;