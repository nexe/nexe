exports.plugin = function(cli)
{
    var history = [], cursor = 0, max = 20;
    
    cli.on('enter', function()
    {
        history.push(cli.buffer());
        
        if(history.length > max)
        {
            history.shift();
        }
        
        
        cursor = history.length-1;
        
    });
    
    
    cli.on('up', function()
    {
        if(cursor == -1) return;
        
        cli.replaceLine(history[cursor--]);
    });
    
    cli.on('down', function()
    {
        if(cursor == history.length-1) return;
        
        cli.replaceLine(history[++cursor]);
    });
}