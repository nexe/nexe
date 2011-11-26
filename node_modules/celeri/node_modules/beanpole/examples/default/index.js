var beanpole = require('../../lib/node').router();

function all()
{
	console.log('all');
	
	if(!this.next())
	{
		console.log("DONE!")
	}
}

function all2()
{
	console.log("ROTATE")
}

function thru()
{
	console.log('thru');

	if(!this.next())
	{
		console.log("CANNOT CONTINUE!")
	}
}

function thru2()
{
	console.log("THRU 2");
	this.next();
}

function sayHi(message)
{
	console.log(message);
}

beanpole.on({
	'dispatch /*': all,
	// 'dispatch -d /*': all2,
	'dispatch thru2': thru2,
	'dispatch thru2 -> thru': thru,
	'dispatch thru2 -> thru -> thru ->  hello': sayHi
});

// beanpole.dispatch('hello','world!');
// beanpole.dispatch('hello','world!');
beanpole.dispatch('hello','world!');