var beanpole = require('../../lib/node'),
	argv = process.argv.concat();

beanpole.require(['hook.http.mesh','hook.core']);

beanpole.on({

	'pull -public thru/hook2': function()
	{
		console.log("Through hook 2");


		setTimeout(function(self)
		{
			console.success("done!")
			self.next();
		}, 500, this)
	},

	'push -public hook1/ready': function()
	{
		console.log("Connected to hook 1");
	}
});


beanpole.push('init');
beanpole.push('ready','hook2');


console.log('hook2 is ready');

