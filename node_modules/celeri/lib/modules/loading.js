exports.plugin = function(cli)
{
    cli.loading = function(label, callback)
    {   
    
        if(typeof label == 'function')
        {
            callback = label;
            label = '';
        }
        
        if(!label) label = '';
        
        
        function done(message, success)
        {
            if(!message) message = success == undefined ? 'done' : (success ? 'success' : 'fail') ;
            
            var color = success == undefined ? 'grey' : (success ? 'green' : 'red');
            
            
            clearInterval(interval);
            cli.replaceLine(label + message[color]['bold']);
            cli.newLine();
        }
        
        if(callback) callback(done);
        
        var seq = '–\|/';
        pos = 0,
        interval = setInterval(function()
        {
            cli.replaceLine(label+'['+seq[pos++%seq.length].blue+'] ');
        }, 200);
        
        
        return {
            done: done
        };
        
        
    }
}