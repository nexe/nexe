var beanpole = require('../../lib/node').router();
	
function delay()
{
	setTimeout(function (self){ self.next(); }, this.data.seconds * 1000, this);
}



beanpole.on({
	'push -filter=BOMB (say/hello or say/hello/world) or blah': function()
	{
		console.log("hello world!")
	},
	'push -filter=GOLD blah': function()
	{
		console.log("GO")
	},

	'pull /*': function()
	{
		console.log("G")
	}
})



beanpole.push('say/hello');
beanpole.push('say/hello/world');
beanpole.push('-filter=GOLD blah');
beanpole.push('-filter=BOMB blah');
beanpole.push('/');