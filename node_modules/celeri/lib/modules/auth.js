exports.plugin = function(cli)
{
    cli.auth = cli.queue(function(callback)
    {           
		var self = this;
		
		self.attach(callback);
	
        cli.prompt('Username: ', function(user)
        {
            cli.password('Password: ','*', function(pass)
            {
                self.next(user, pass);
            });
        });  

    });
}