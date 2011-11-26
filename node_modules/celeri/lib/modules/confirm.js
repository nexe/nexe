exports.plugin = function(cli)
{
                   
    
    cli.confirm = cli.queue(function(label, callback)
    {
        label += ' [y/n]: ';
        
        cli.write(label);
        
        var input = '', yes = 'y', no = 'n',
		self = this;  
		
		self.attach(callback);
        
        var disposable = cli.on({
            'keypress': function(data)
            {
                input = data.char;
                
                cli.buffer(label + input);
            },
            'enter': function()
            {
                if(input != yes && input != no)
                {
                    return cli.write('\nPlease enter "'+yes+'" or "'+no+'"');
                }
                
                
                disposable.dispose();
                
                
                setTimeout(self.next, 1, input == 'y');
            }
        });
    });
}