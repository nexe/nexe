var beanpole = require('../../lib/node').router();
	


beanpole.on({
	
	/**
	 */

	'pull -overridable say/hello': function()
	{
		return "hello";
	},


	'pull say/hello': function()
	{
		return "hello world!"
	}
});

