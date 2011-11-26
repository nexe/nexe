var Request = require('../request'),
	Structr = require('structr');


var PullRequest = Request.extend({
	
	/**
	 */

	'override init': function()
	{
		this._super();

		this._listen(this.callback, this.meta);

		return this;
	},

	/**
	 */

	'override _callback': function()
	{
		var ret = this._super.apply(this, arguments);

		if(ret != undefined)
		{
			if(ret == true)
			{                                 
			}

			if(ret.send)
			{
				ret.send(this);
			}
			else
			{
				this.end(ret);
			}
		}
	}
});


module.exports = PullRequest;
