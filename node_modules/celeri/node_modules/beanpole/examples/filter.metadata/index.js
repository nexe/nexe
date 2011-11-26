var beanpole = require('../../lib/node').router();


function groupHello1(pull)
{
	return "hello!";
}

function groupHello2(pull)
{
	return "hello again!";
}

function groupHello3(pull)
{
	return "hello for a third time!";
}


function init()
{
	//hello!
	//hello again!
	//hello for a third time!
	beanpole.pull('-multi say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello!
	//hello again!
	beanpole.pull('-multi -name=group1 say/hello', function(msg)
	{
		console.log(msg)
	});

	//hello for a third time!
	beanpole.pull('-multi -name=group2 say/hello', function(msg)
	{
		console.log(msg)
	});
}

beanpole.on({
	'push init': init,

	//-multi=N is set so props aren't overridden
	'pull -name=group2 -multi=3 say/hello': groupHello3,
	'pull -name=group1 -multi=2 say/hello': groupHello2,
	'pull -name=group1 -multi=1 say/hello': groupHello1
});

beanpole.push('init')