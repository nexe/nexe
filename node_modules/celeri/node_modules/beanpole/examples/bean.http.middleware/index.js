var beanpole = require('../../lib/node').router(),
express = require('express'),
Url = require('url');

beanpole.require('middleware.core');

beanpole.on({


	/**
	 */

	'pull -public basic/auth/root/pass -> basic/auth': function()
	{
		if(!this.next()) return 'authorized!';
	},

	/**
	 */

	'pull -public basic/auth -> auth/text': function()
	{
		return "authorized: " + this.user.name;
	},

	
	/**
	 */

	'pull -public session -> test/session': function()
	{
		var sess = this.session.data;

		if(!sess.numVisits) sess.numVisits = 0;

		sess.numVisits++;

		return 'Num Visits: '+sess.numVisits;
	},

	/**
	 */

	'push init': function(init)
	{
		var srv = express.createServer(),
		channels = beanpole.channels();


		function initPath(path, expr)
		{
			srv.get('/' + path, function(req, res)
			{
				beanpole.pull(Url.parse(req.url).pathname, null, { meta: { stream: 1 }, req: req }, function(writer)
				{
					writer.on({
						response: function(headers)
						{
							if(headers.session)
							{
								res.setHeader('Set-Cookie', headers.session.http)
							}

							if(headers.authorization)
							{
								res.statusCode = 401;
								res.setHeader('WWW-Authenticate', headers.authorization.http);
							}
						},
						write: function(data)
						{
							res.write(typeof data == 'object' ? JSON.stringify(data) : data);
						},
						end: function()
						{
							res.end();
						}
					});

				})
			});
		}

		for(var channel in channels)
		{
			var expr = channels[channel];

			if(expr.type == 'pull' && expr.meta.public)
			{
				initPath(channel, expr);
			}
		}

		srv.listen(8032);
	}


});


beanpole.push('init');