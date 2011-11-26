var Stream  = require('../stream'),
	PushPullRequest = require('../request');


var PushRequest = PushPullRequest.extend({

	/**
	 */

	'override init': function()
	{
		this._super();

		this.cache();
		this.stream.pipe(this);


		return this;
	},

	/**
	 */

	'override _callback': function(route, data)
	{
		this._listen(route.callback, route.meta || {});
	}
});

module.exports = PushRequest;
