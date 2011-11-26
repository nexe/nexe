var beanpole = require('../../lib/node'),
	argv = process.argv.concat();

beanpole.require(['hook.http.mesh','hook.core']);

beanpole.on({
	'pull -public hook2': function()
	{
		this.next();
	},
	'pull -public hook2 -> thru/hook2 -> test/hook': function()
	{
		console.log("fetching account...");

		return "Successfuly passed through remote middleware";
	},
	'push -public hook2/ready': function()
	{
		console.log("Connected to hook 2");

		beanpole.pull('test/hook', function(message)
		{
			console.success(message);
		})
	}
});

beanpole.push('init');
beanpole.push('ready','hook1');


console.log('hook1 is ready');