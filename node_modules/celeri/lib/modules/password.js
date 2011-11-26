exports.plugin = function(cli)
{

    function getMask(mask, length)
    {
        if(!mask) return '';
        
        var buffer = '';
        
        for(var i = length; i--;)
        {
            buffer += mask;
        }
        
        return buffer;
    }

    
    cli.password = cli.queue(function(label, mask, callback)
    {
        if(typeof mask == 'function')
        {
            callback = mask;
            mask = undefined;
        }                

        
        
        cli.write(label);
        
        var input = '',
		self = this;
		
		self.attach(callback);
        
        
        var disposable = cli.on({
            'backspace': function()
            {
                if(!input.length) return;
                 
                input = input.substr(0, input.length-1);
            },
            'keypress': function(data)
            {
                if(data.key.name != 'backspace')
                    input += data.char;
                
                cli.buffer(label+getMask(mask, input.length));
            },
            'enter': function()
            {
                setTimeout(self.next,1,input);
                disposable.dispose();
            }
        });
    });
}