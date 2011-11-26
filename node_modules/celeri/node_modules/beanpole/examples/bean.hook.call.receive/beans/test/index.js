var lazy = require('sk/core/lazy').callback;


exports.plugin = function(mediator)
{
	var ops, sent = 0, received = 0, pulls = 0, capp = 0, interval;
	
	function testSend(pull)
	{
		// console.log('received: %d', ++received);

		/*if(received != sent)
		{
			console.log(recieved-sent)
		}*/


		pull.end(++received);
	}
		
	function pushHook(data, err, request)
	{
		console.success('starting test.');
        
		timeout(data, ++capp, request);
	}

	function timeout(data, index, request)
	{
		var margin = 0;

		setTimeout(function()
		{
			for(var i = ops.concurrent; i--;)
			{
				// console.log('sent %d', ++sent);

				margin++;
                

				request.from.pull('test/send', function(rcv)
				{
					// console.log('received: %d', rcv);

					//wait till everything's done. Stop if anything's missed.
					if(!(--margin))
					{
						console.log('#%d: done pulling %d requests from app #%d', ++pulls, ops.concurrent, index);
						timeout(request, index);
					}

				});	
			}
			
		}, ops.speed);
	}
	
	function init(op)
	{
		ops = op;
		console.success('ready: speed=%d, concurrent=%d', ops.speed, ops.concurrent);

		console.success('Now open another terminal window with the same script'.underline);
	}
	
	mediator.on({
		'push init': init,
		'pull -public test/send': testSend,
		'push hook/connection': pushHook
	});
    
}