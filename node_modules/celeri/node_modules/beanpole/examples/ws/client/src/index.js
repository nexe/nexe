var beanpole = require('../../../../lib/core').router();



function pluginExample(router)
{

	var name = prompt("What's your name?", 'craig');
	var time = Number(prompt("When do you want an alert? (in seconds)", 1));


	function appendBody(message)
	{
		var div = document.createElement('div');
		div.innerHTML = message;
		document.body.appendChild(div);
	}


	router.on({

		/**
		 */

		'pull -public some/random/callback': function(request)
		{
			appendBody(request.data.message);

			this.from.push('notify/clients', request.data);

			request.end();
		},

		/**
		 */

		'push send/message': function(data)
		{
			beanpole.push('call/later', { channel: 'some/random/callback', data: { _id: new Date().getTime(), message: data.message }, sendAt: new Date().getTime() + data.delay})
		},

		/**
		 */

		'push -public notify/clients': function(data)
		{
			appendBody('notified from another client: '+ data.message);
		}
	});


	beanpole.on({
		'push -public -one spice.io/ready': function()
		{
			beanpole.push('send/message', { message: "hello " + name +"!", name: name, delay: time * 1000});
		}
	});	
}

require('../../../../lib/core/beans/hook.core').plugin(beanpole);
require('../../../../lib/web/beans/hook.socket.io.client').plugin(beanpole);
pluginExample(beanpole);

beanpole.push('ready','client');
beanpole.push('init');   
