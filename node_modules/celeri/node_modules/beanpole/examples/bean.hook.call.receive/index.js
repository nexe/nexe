var beanpole = require('../../lib/node'),
cli = require('sk/node/cli');

var ops = {};

process.stdout.write('num concurrent calls: ');
			
cli.next(function(arg)
{
	ops.concurrent = Number(arg) || 10;

	process.stdout.write('speed (ms): ');

	cli.next(function(arg)
	{
		ops.speed = Number(arg) || 200;
        

		beanpole.require(['hook.core','hook.http.mesh']).
		require(__dirname + '/beans').push('init', ops);
	})
})




//
	