var beanpole = require('../../lib/node').router();


beanpole.require(['hook.core','hook.socket.io.server','hook.http.mesh']);

beanpole.on({
	
	/**
	 */

	'push init': function()
	{
		beanpole.push('ready', 'spice.io');
	},

	/**
	 */


	'pull -public say/hello': function()
	{
		return "hello MADRE!"; 
	},


	/**
	 */


	'push -public client/ready': function()
	{
		console.log("CLIENT READY");
		this.from.pull('get/name', function(name)
		{
			console.log(name)
		})
	}
});

beanpole.push('init');