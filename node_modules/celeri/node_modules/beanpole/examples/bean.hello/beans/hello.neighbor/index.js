exports.plugin = function(mediator)
{

	function sayHello(pull)
	{
		pull.end('Hello Neighbor!');
	}


	mediator.on({
		'pull -multi -public say/hello': sayHello
	})
}