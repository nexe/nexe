exports.plugin = function(cli)
{
    cli.prompt = cli.queue(function(label, callback)
    {
        var input = '',
		self = this;
		
		self.attach(callback);
        
        
        function write()
        {
            cli.replaceLine(label+input);
        }
        
        
        var disp = cli.on({
            'backspace': function()
            {
                if(!input.length) return;
                 
                input = input.substr(0, input.length-1);
            },
            'keypress': function(data)
            {
                if(data.key.name != 'backspace')
                input += data.char;
                
                write();
            },
            'enter': function()
            {
                setTimeout(self.next, 1, input);
                disp.dispose();
            }
        });
        
        write();
    });
    
}