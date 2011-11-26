var Router   = require('../../../../concrete/router'),
Stream = require('../stream'),
utils = require('../../../../concrete/utils'),
Structr = require('structr');


var PushRouter = Router.extend({
	
	/**
	 */

	'override on': function(expr, ops, callback)
	{
		if(!callback)
		{
			callback = ops;
			ops = {};
		}

		var ret = this._super(expr, ops, callback);


		if(expr.meta.pull)
		{
			this.controller.pull(expr, Structr.copy(ops.data), { ignoreWarning: true }, callback);
		}
		
		return ret;
	},

	/**
	 */

	'override _callListeners': function(ops)
	{

		//the stream for pushing content. must be cached incase there's latency.
		var stream = new Stream(true),

		//no callback? then data's just being pushed, which is okay
		callback = ops.callback || function(stream)
		{
			return ops.data;
		}

		//of there's a callback, it can return a value which is pushed to the stream
		var ret = callback(stream);

		//IF there's a value, then we're done
		if(ret != undefined)
		{
			stream.end(ret);
		}

		//make the stream visible to all listeners
		ops.stream = stream;

		//SHIBLAM. call the listeners ;)
		this._super.apply(this, arguments);
	}
});

module.exports = PushRouter;
