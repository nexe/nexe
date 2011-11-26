exports.plugin = function(mediator)
{
	
	function init()
	{
		var i = 0;

		//default
		mediator.pull('load/site', { site: 'http://www.google.com/' }, function(chunk)
		{
			console.log('http://www.google.com chunk #%d', i++);
		});

		//letting brazilnut handle the combining of buffers
		mediator.pull('-batch load/site', { site: 'http://www.engadget.com/' }, function(buffer)
		{
			console.log('done reading http://engadget.com with %d chunks.', buffer.length);
		});


		//streaming data
		mediator.pull('-stream load/site', { site: 'http://www.google.com/' }, function(reader)
		{
			var buffer = [];

			reader.on({
				write: function(chunk)
				{
					buffer.push(chunk)
				},
				end: function()
				{
					console.log('done reading http://google.com with %d chunks.', buffer.length);
				}
			})
		});

		

	}
	
	mediator.on({
		'push init': init
	});
	
}