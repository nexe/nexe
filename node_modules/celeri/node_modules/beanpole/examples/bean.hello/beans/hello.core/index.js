exports.plugin = function(mediator)
{
	
	function init()
	{
		console.log('calling plugins to say hello...');
		
		mediator.pull(' -multi say/hello', function(response)
		{
			console.log(response);
		});
	}
	
	mediator.on({
		'push init': init
	});
	
}