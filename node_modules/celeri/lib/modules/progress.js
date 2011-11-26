exports.plugin = function(cli)
{
    var spaces = 20,
    perc = 0;
    
    function percentBuffer(label, color)
    {
        var diff = Math.round((spaces/100) * perc);
        
        
        return label + ' ['+ cli.utils.fill('#'[color],diff,' ', spaces-diff) + '] '+ perc +'% ';
    }
    
    cli.progress = function(label, percent)
    {      
        //fail
        if(percent === false)
        {
            cli.replaceLine(percentBuffer(label, perc, 'red'));
            return cli.newLine();
        }
    
        perc = Math.min(percent, 100);
        
        cli.replaceLine(percentBuffer(label, perc == 100 ? 'green' : 'blue'));
        
        if(perc == 100)
        {
            return cli.newLine();
        }
        
    };
}