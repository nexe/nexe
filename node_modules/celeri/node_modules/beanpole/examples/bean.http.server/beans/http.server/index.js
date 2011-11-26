var express = require('express');

exports.plugin = function(mediator)
{

	function init(pull)
	{
		var srv = express.createServer();

		mediator.pull('hook', function(data)
		{
			data.channels.forEach(function(channel)
			{
				srv.get('/'+channel.name, function(req, res)
				{
					var name = channel.name;

					for(var param in req.params)
					{
						name = name.replace(':'+param,req.params[param])	
					}

					mediator.pull('-stream ' + name, function(writer)
					{
						writer.pipe(res);
					})
				});
			});

			srv.listen(8032);
		});

	}

	console.log('Server running on port ' + 8032+'. try http://localhost:8032/meta/[1,2,3], or omit the number and watch them rotate.');
	

	mediator.on({
		'push init': init
	});	
}