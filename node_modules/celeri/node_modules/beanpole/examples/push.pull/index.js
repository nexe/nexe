var beanpole = require('../../lib/node').router();
	


beanpole.on({
	'pull name': function()
	{
		setTimeout(function()
		{
			beanpole.push('name', function()
			{
				return "SLAYERS!";
			});

			beanpole.push('name', 'PUSH');
			// beanpole.push('name', 'PUSH');
			// beanpole.push('name', 'PUSH');
			// beanpole.push('name', 'PUSH');
			// beanpole.push('name', 'PUSH');
		}, 100);

		return 'PULL';
	},
	'push /*': function()
	{
		console.log("PUSH INITIALIZED!");
		this.next();
	},
	'push through': function(data)
	{
		console.log("delay!")
		setTimeout(function(self){ self.next(); }, 500, this)
	},
	'push -pull name': function(name)
	{
		console.log(name)
	},
	'push -pull name': function(name)
	{
		console.log(name)
	},
	/*'push name': function(name)
	{
		console.log(name +' PUSH')
	}*/
});