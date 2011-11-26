var beanpole = require('../../lib/node').router(),
Structr = require('structr');
	


function hello()
{
	return "hello!.";
}                            
       




beanpole.on({                      
	'pull hello/silly/world': hello
})        

var start = new Date();

for(var i = 10000; i--;)
{
	beanpole.pull('hello/silly/world', function (res)
	{
		// console.log(res)
	});
	                
}

console.log(new Date().getTime() - start.getTime());

                                