var beanpole = require('../../lib/node').router();


beanpole.require(['hook.core','hook.http.mesh']);

beanpole.on({
	
	/**
	 */

	'push init': function()
	{
		beanpole.push('ready', 'spice.io');
	},

	/**
	 */


	'push -public call/later': function(data)
	{
		console.log('calling later');

		var self = this;

		setTimeout(function()
		{
			self.from.pull(data.channel, data.data, { inner: self.inner }, function(result)
			{
				console.log(result)
			})
		},Math.max(0, data.sendAt - new Date().getTime()));
		// setTimeout()
	}
});

beanpole.push('init');