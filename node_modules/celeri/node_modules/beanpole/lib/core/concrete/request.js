var Structr = require('structr'),
Parser = require('./parser'),
utils = require('./utils');


var Request = Structr({
	
	/**
	 */

	'__construct': function(listener, batch)
	{
		//data necessary for the request
		this.data     = batch.data;

		//inner data which is invisible to the request, but contains data which needs to get passed along
		this.inner = batch.inner;

		//the end callback
		this.callback = batch.callback;

		this._used = {};
		this._queue = []; 

		//yes, and I know what you're thinking: why the hell are you copying data?
		//Well, we work backwards, and we don't know if parameters might override data passed to the current URI - we need to be prepared for that. SO
		//as we're working our way back up, data will be set, and the original data will be mapped the way it should be for the given URI
		this._add(listener, Structr.copy(this.data, true), batch.paths);

		
		if(batch._next)
		{
			this.add(batch._next);
		}

		this.last = this._queue[0].target;
	},

	/**
	 */

	'init': function()
	{
		return this;
	},

	/**
	 */

	'hasNext': function()
	{
		return !!this._queue.length;
	},

	/**
	 */

	'next': function()
	{
		if(this._queue.length)
		{
			var thru = this._queue.pop(),
			target = thru.target;

			this.current = target;

			if(target.paths)
			{
				var route = this.origin.getRoute({ channel: target });

				this._addListeners(route.listeners, route.data, target.paths);
				return this.next();
			}


			//heavier...
			/*var route = this.expandRoute(this._queue.length-1);

			if(!route) return this.next();

			target = route.target,
			thru = route.thru;
			this._queue.pop();*/


			this.current = target;


			if(target.isMiddleware && this._used[target.id]) return this.next();

			//keep tabs of what's used so there's no overlap. this will happen when we get back to the router
			//for middleware specified in path -> to -> route
			this._used[target.id] = thru;
			
			this._prepare(target, thru.data, thru.hasParams, thru.paths);
			

			return true;
		}

		return false;
	},

	/**
	 * expands all the routes (middleware even). See leche for example
	 */
	
	/*'expandThru': function()
	{

		var i = 0;

		while(i < this._queue.length)
		{
			if(this.expandRoute(i))
			{
				i++;
			}
			else
			{
				i = 0;
			}
		}

	},*/

	/**
	 */

	/*'expandRoute': function(index)
	{
		var thru = this._queue[index],
		target = thru.target;

		if(target.paths)
		{
			this._queue.splice(index, 1);
			var route = this.origin.getRoute({ channel: target }), n = this._queue.length;


			this._addListeners(route.listeners, route.data, target.paths);
			
			return false;
		}

		return { target: target, thru: thru };
	},*/

	/**
	 */

	'forward': function(channel, callback)
	{
		return this.origin.dispatch(Parser.parse(channel), this.data, { inner: this.inner, req: this.req }, callback);	
	},

	/**
	 */

	'thru': function(channel, ops)
	{
		var self = this;

		if(ops) Structr.copy(ops, this, true);


		this._queue.push({ target: Parser.parse('-stream ' + channel).channels[0] });

		this.next();

		/*this.origin.dispatch(Parser.parse('-stream' + channel), this.data, Structr.copy({  inner: this.inner, req: this.req, _next: callback }, ops, true), function(request)
		{
			request.pipe(self);	
		})*/	
	},

	/**
	 */
	
	'_addListeners': function(listeners, data, paths)
	{
		if(listeners instanceof Array)
		{
			for(var i = listeners.length; i--;)
			{
				this._add(listeners[i], data, paths);
			}
			return;
		}
	},

	/**
	 * adds middleware to the END of the call stack
	 */
	
	'add': function(callback)
	{
		this._queue.unshift(this._func(callback));
	},

	/**
	 * adds  middleware to the beginning of the call stack
	 */
	
	'unshift': function(callback)
	{
		this._queue.push(this._func(callback));
	},

	/**
	 */

	'_func': function(callback)
	{
		return { target: { callback: callback }, data: {} };
	},

	/**
	 */

	'_add': function(route, data, paths)
	{
		var current = route, _queue = this._queue,
		hasParams = false;

		if(!data) data = {};

		while(current)
		{
			for(var i = paths.length; i--;)
			{
				var opath = paths[i],
				cpath = route.path[i],
				param,
				value;


				if(cpath.param && !opath.param)
				{
					param = cpath.name;
					value = opath.name;
				}
				else
				if(cpath.param && opath.param)
				{
					param = cpath.name;
					value = this.data[opath.name];
				}
				else
				{
					continue;
				}

				hasParams = true;


				this.data[param] = data[param] = value;


				// if(!this.data[param]) this.data[param] = value;
			}

			//make sure not to use the same route twice. this will happen especially with middleware specified as /middleware/*
			_queue.push({ target: current, data: data, hasParams: hasParams, paths: paths });

			current = current.thru;
		}
	},


	/**
	 */

	'_prepare': function(target, data, hasParams, paths)
	{
		//call once, then dispose
		if(target.meta && target.meta.one)
		{
			target.dispose();
		}

		if(hasParams)
		{
			Structr.copy(data, this.data,true);
		}


		if(target.path) this.currentChannel = utils.pathToString(target.path, this.data);

		this._callback(target, data);
	},

	/**
	 */

	'channelPath': function(index)
	{
		return utils.pathToString(this._queue[index].target.path || [], this.data);
	},

	/**
	 */

	'_callback': function(target, data)
	{
		return target.callback.call(this, this);
	}
});

module.exports = Request;