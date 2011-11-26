var fs = require('fs');

exports.plugin = function(cli)
{
    //cli.help = function(){};
    
    
    cli.openHelp = function(filePath, prefix)
    {
        if(!prefix) prefix = '';
        
        var helpTxt = fs.readFileSync(filePath,'utf8'), coloredText;
			
        
        //colored text
        while(coloredText = helpTxt.match(/<(.*?)>([\w\W]*?)<\/\1>/))
        {
            var colorAttrs = coloredText[1].split(' '),
                text = coloredText[2];
                
            colorAttrs.forEach(function (attr)
            {
                text = text[attr];
            });
                
            helpTxt = helpTxt.replace(coloredText[0],text);
        }
        
        /*helpTxt.split('\n').forEach(function(line)
        {
            console.log(prefix+line);
        });*/
        
        console.log(helpTxt);
    }
    
    
    /*cli.on('help', function()
    {
        cli.help();
    });*/
}