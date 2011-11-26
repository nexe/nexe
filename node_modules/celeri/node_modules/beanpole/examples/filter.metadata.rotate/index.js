var beanpole = require('../../lib/node').router();


function hello1(pull)
{
	return "hello 1!";
}

function hello2(pull)
{
	return "hello 2!";
}

function hello3(pull)
{
	return "hello 3!";
}


function init()
{
	//hello 3!
	beanpole.pull('say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello 1!
	beanpole.pull('say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello 2!
	beanpole.pull('say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello 2!
	beanpole.pull('-name=group1 say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello 3!
	beanpole.pull('-name=group1 say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello 1!
	beanpole.pull('-name=group2 say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello 1!
	beanpole.pull('-name=group2 say/hello', function(msg)
	{
		console.log(msg)
	});
}

beanpole.on({
	'push init': init,

	//NOTE: rotate=N is provided just so the properties aren't overridden
	'pull -name=group2 -rotate=3 say/hello': hello1,
	'pull -name=group1 -rotate=2 say/hello': hello2,
	'pull -name=group1 -rotate=1 say/hello': hello3
});


beanpole.push('init');