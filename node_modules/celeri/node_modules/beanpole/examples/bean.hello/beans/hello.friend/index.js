exports.plugin = function(mediator)
{

	function sayHello(pull)
	{
		pull.end('Hello Friend!');
	}
	

	mediator.on({
		'pull -multi -public say/hello': sayHello
	});	
}