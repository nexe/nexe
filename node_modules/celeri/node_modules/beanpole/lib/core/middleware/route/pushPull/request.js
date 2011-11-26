var Request = require('../../../concrete/request'),
Stream = require('./stream'),
Structr = require('structr');

/**
 */

var PushPullRequest = Request.extend(Structr.copy(Stream.proto, {

	/**
	 */

	'init': function()
	{
		this._init();

		return this;
	},

	/**
	 */

	'_listen': function(listener, meta)
	{
		//because the framework needs to be easy to use, streams are turned off by default. This
		//would be a huge pain in the pass if every time they're required, but they're SUPER important
		//if we're trying to stream a large amount of data. What about HTTP? So if it's false, we need to 
		//add a stream handler.
		if(!meta.stream)
		{
			//the buffer for the streams
			var buffer = [], self = this;

			function end(err)
			{
				if(err) return;
				
				//again, it would be a pain in the ass if everytimg we have to do: var value = response[0]. So
				//a "batch" must be specified if we're expecting an array, because 99% of the time for in-app route handling, 
				//only ONE value will be returned. 
				if(meta.batch)
				{
					listener.call(self, buffer, err, self);
				}
				else
				{
					if(!buffer.length)
					{
						listener();
					}
					else
					//so again, by default callback the listener as many times as there are batch values
					for(var i = 0, n = buffer.length; i < n; i++)
					{
						listener.call(self, buffer[i], err, self);
					}
				}
			}

			this.pipe({


				//on write, throw the data into the buffer
				write: function(data)
				{
					buffer.push(data);
				},

				error: end,

				//on end, callback the listener
				end: end
			});
		}

		//is the listener expecting a stream? Okay, then pass on the writer to the listener. Only use this for files, http requests, and the
		//likes plz, omg you're code would look like shit otherwise >.>
		else
		{
			//more flavor picking. Use this, or the passed obj
			listener.call(this, this);
		}
	}
}));



module.exports = PushPullRequest;
