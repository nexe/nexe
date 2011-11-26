var beanpole = require('../../lib/node').router();
	


function sayHi2()
{
	console.log('pass!');
	
	// return 'ga'
	if(!this.next())
	{
		console.log("FAIL")
	}
}

function sayHi3()
{
	console.log(this.data)
}


function init()
{
	beanpole.push('hello3', 'craig!');
}

beanpole.on({
	'push init': init,
	'push hello2 -> hello2 -> hello2 -> hello2 -> hello2 -> hello2 -> hello': sayHi2,
	'push hello2': sayHi2,
	'push hello -> hello2 -> hello3': sayHi3
})


beanpole.push('init');