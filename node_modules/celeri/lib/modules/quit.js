exports.plugin = function(cli)
{
    cli.on('ctrl-c', function()
    {
        process.exit();
    });
}