var beanpole = require('../../lib/node').router();
	


function sayHi()
{
	console.log(this.data)
	console.log('hi')
	// this.next();
	if(!this.next()) return "don't pass " + this.data.name+ " "+this.data.last;
}

function sayHi2()
{
	console.log('pass!');

	if(!this.next())
	{
		this.end("GO")
	}
}

function sayHiCraig()
{
	if(!this.next()) return "GO"
}

function sayHi3()
{
	if(!this.next()) return "hello";
}


function init()
{
	beanpole.pull('hello2/craig', function(result)
	{
		console.log(result)
	});	
	
}

function test2()
{
	
}

beanpole.on({
	'push init': init,
	'pull /*': function()
	{
		console.log("PSSS")	;
		this.next();
	},
	'pull hellotest': sayHi2,
	'pull hellotest -> hellotest -> hello2/:name': sayHi3
});

// console.log(beanpole.routeMiddleware._routers.pull._collection._routes)

beanpole.push('init');