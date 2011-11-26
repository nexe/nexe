var beanpole = require('../../lib/node').router();
	
function intercept(pull)
{
	//change the data
	pull.data.sport = 'soccer';

	pull.next();
}

function test(pull)
{
	pull.end(pull.data.sport)
}

function init()
{
	beanpole.pull('test', { sport: 'football' }, function(result)
	{
		console.log(result)
	});
}

beanpole.on({
	'push init': init,
	'pull -intercept=sport te`st/interception': intercept,
	'pull test': test
})


beanpole.push('init');