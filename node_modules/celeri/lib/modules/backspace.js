exports.plugin = function(cli)
{
    
    
    cli.on('backspace', function()
    {
        var pos = cli.cursor();
        
        if(pos == cli.inputPrefix().length) return;
        
        cli.spliceLine(pos-1, 1, pos-1);
        //cli.replaceLine(buffer.substr(0, pos-1) + buffer.substr(pos, buffer.length-pos), pos-1);
        
    });
    
    cli.on('delete', function()
    {
        var pos = cli.cursor();
        
        cli.spliceLine(pos, 1, pos);
    });
}