var Structr = require('structr'),
Parser = require('./parser'),
utils = require('./utils'),
middleware = require('../middleware/meta'),
Request = require('./request'),
Collection = require('./collection');



/**
 * Glorious. 
 */

var Router = Structr({
	
	/**
	 * Constructor. What else do you think it is?
	 */

	'__construct': function(ops)
	{
		if(!ops) ops = {};

		this.RequestClass = ops.RequestClass || Request;
		this._collection = new Collection(ops);
		this._allowMultiple = !!ops.multi;

	},

	/**
	 * listens to the given expression for any change
	 */

	'on': function(expr, ops, callback)
	{
		if(!callback)
		{
			callback = ops;
			ops = null;
		}

		for(var i = expr.channels.length; i--;)
		{
			var single = utils.channel(expr, i),
			existingRoute = this.getRoute(single);

			if(existingRoute.listeners.length && !this._allowMultiple  && !this._middleware().allowMultiple(single))
			{         
				var epath = existingRoute.listeners[0].path;
				                                             
				//use-case: server crashes, and reboots. Needs to override current registered path (which is trash)
				if(existingRoute.listeners[0].meta.overridable)
				{
					existingRoute.listeners[0].dispose();
				}
				else        
				         
				//if both are params, then there's a collission.
				if(single.channel.paths[single.channel.paths.length-1].param == epath[epath.length-1].param)
				{                                            
					throw new Error('Path "'+utils.pathToString(single.channel.paths)+'" already exists');
				}
			};

			this._middleware().setRoute(channel);
		}

		
		return this._collection.add(expr, callback);
	},

	/**
	 */

	'_middleware': function()
	{
		return this.controller.metaMiddleware;
	},

	/**
	 */

	'hasRoute': function(channel, data)
	{
		return !!this.getRoute(channel, data).listeners.length;
	},

	/**
	 */

	'hasRoutes': function(expr, data)
	{
		for(var i = expr.channels.length; i--;)
		{
			if(this.hasRoute(utils.channel(expr, i), data)) return true;
		}

		return false;
	},

	/**
	 */

	'getRoute': function(single, data)
	{
		var route = this._collection.route(single.channel);

		var r = this._middleware().getRoute({
			expr: single,
			router: this,
			route: route,
			data: data,
			listeners: this._filterRoute(single, route)
		});
        
        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//this chunk is experimental. Moreso to test its usefulness over anything. The initial
		//thought is enable the ability for routes with *different* metadata to share the same channel. This is great
		//If say, you have web-workers which use the same channels, but different cluster IDs, so a master server knows 
		//what data to send to what web-worker. This COULD be specified in the URI structure, but that feels a bit messy. We'll see if this works first. It's nice and clean. 
		//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        if(!this._middleware().allowMultiple(route) && !this._allowMultiple && r.listeners.length)
        {
            r.listeners = [r.listeners[0]];
        }
        
        return r;
	},

	/**
	 */

	'dispatch': function(expr, data, ops, callback)
	{	
		//only one for now. may change later on.
		for(var i = expr.channels.length; i--;)
		{
			if(this._dispatch(utils.channel(expr, i), data, ops, callback)) return true;		
		}

		return false;
	},

	/**
	 */

	'_dispatch': function(expr, data, ops, callback)
	{
		if(data instanceof Function)
		{
			callback = data;
			data     = undefined;
			ops      = undefined;
		}

		if(ops instanceof Function)
		{
			callback = ops;
			ops     = undefined;
		}

		if(!ops) ops = {};
		if(!data) data = {};

		channel = utils.pathToString(expr.channel.paths);

		var inf = this.getRoute(expr, data);        

		//warnings are good incase this shouldn't happen
		if(!inf.listeners.length)
		{	
			if(!ops.ignoreWarning && !expr.meta.passive)
			{
				console.warn('The %s route "%s" does not exist', expr.type, channel);
			}
			
			//some callbacks are passive, meaning the dispatched request is *optional* ~ like a plugin
			if(expr.meta.passive && callback)
			{
				callback(null, 'Route Exists');
			}
			return false;
		}	


		var newOps = {

			//router is set to controller because router() is used in loader. keeps things consistent, and using "this.controller.pull" is vague 
			router: this.controller,

			//where the route lives
			origin: this,

			//data attached, duh. 
			data: inf.data,

			//inner data
			inner: ops.inner || {},

			channel: channel,

			paths: inf.expr.channel.paths,

			//the metadata attached to the expression. Tells all about how it should be handled
			meta: expr.meta,

			//where is the dispatch coming from? Useful for hooks
			from: ops.from || this.controller,

			//the listeners to dispatch
			listeners: inf.listeners,

			//the final callback after everything's done ;)
			callback: callback
		};

		Structr.copy(newOps, ops, true);

		this._callListeners(ops);

		return true;
	},

	/**
	 */

	'_callListeners': function(newOps)
	{
		for(var i = newOps.listeners.length; i--;)
		{
			Structr.copy(newOps, new this.RequestClass(newOps.listeners[i], newOps), true).init().next();
		}
	},

	/**
	 * filters routes based on metadata
	 */

	'_filterRoute': function(expr, route)
	{
		if(!route) return [ ];

		var listeners = (route.listeners || []).concat();
        

		//Useful if there are groups of listeners with the same channel, but should not communicate
		//with each other. E.g: two apps with slaves, sending queues to thyme. Thyme would need to know exactly where the slaves are
		for(var name in expr.meta)
		{
			//the value of the metadata to search
			var value = expr.meta[name];
			
			//make sure that it's not *just* defined. This is important
			//for metadata such as streams
			if(value === 1) continue;
			
			//loop through the listeners and start filtering
			for(var i = listeners.length; i--;)
			{
				var listener = listeners[i];
                
				if(listener.meta.unfilterable) break;
 
				var metaV = listener.meta[name];
				
				//if value == 1, then the tag just needs to exist
				if(metaV != value && metaV != '*')
				{
					listeners.splice(i, 1);
				}
			}
		}

		

		return listeners;
	}
});



module.exports = Router;