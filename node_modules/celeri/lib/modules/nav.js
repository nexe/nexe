exports.plugin = function(cli)
{

    cli.on('left', function()
    {
        cli.cursor(cli.cursor()-1);
    });
    
    cli.on('right', function()
    {
        cli.cursor(cli.cursor()+1);
    });
}