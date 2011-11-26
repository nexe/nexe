var exec = require('child_process').exec;

exports.plugin = function(router)
{

	router.on({
		
		/**
		 */

		'push init': function()
		{
            exec('hostname', function(err, hostname)
            {
                router.on('pull hostname', function()
                {
                    return hostname;
                });
                
                router.push('hostname', hostname.replace('\n',''));
            });
		},


	})
}