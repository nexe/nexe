var lazy = require('sk/core/lazy').callback;


exports.plugin = function(mediator)
{
	var myName;
	
	function pushSayHello(guestName)
	{
		console.log('hello %s!', guestName);

		if(this.from)
		{
			this.from.push('say/hello/back', myName);
		}
	}

	function pushSayHelloBack(guestName, push)
	{
		console.log('%s said hello back!', guestName);
	}
		
	function pushHook(data, push)
	{
		console.success('A person decided to join the partayyy.');
		push.from.push('say/hello', myName)
	}
	
	function init(n)
	{
		myName = n;
		pushSayHello(n);
	}
	
	mediator.on({
		'push init': init,
		'push hook/connection': pushHook,
		'push -public say/hello': pushSayHello,
		'push -public say/hello/back': pushSayHelloBack,
	})
}