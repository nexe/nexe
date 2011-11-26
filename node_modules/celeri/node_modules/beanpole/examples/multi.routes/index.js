var beanpole = require('../../lib/node'),
	argv = process.argv.concat();

var router = beanpole.router(),
router2 = beanpole.router();



var listen = {
	'push hello': function()
	{
		console.log('hello!')
	}
}


router.on(listen).dispose();
router2.on(listen);

router.push('hello')