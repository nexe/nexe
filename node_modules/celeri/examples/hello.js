var celery = require('../lib');

celery.open({  
    prefix: 'hello > '
});
celery.on('hello :name', function(data)
{
    console.log('hello %s, how are you doing?', data.name);
});

celery.on('download/:file', function(data)
{
    console.log("starting");
    
    var i = 0;
    
    data.file = decodeURIComponent(data.file);
    
    var interval = setInterval(function()
    {
        
        celery.progress('Downloading '+data.file+':', i++);
    
        if(i > 100)
        {
            clearInterval(interval);
            celery.newLine('done!');
        }
    }, 10);
});


celery.on(['timeout :ttl','timeout :ttl :status'], function(data)
{
    var loader = celery.loading('timeout for '+data.ttl+' seconds: ');
    
    setTimeout(function()
    {
        if(data.status != undefined)
        {
            loader.done(data.status == 'success');
        }
        else
        {
            loader.done();
        }
        
    }, Number(data.ttl) * 1000);
});


celery.parse(process.argv);