var celery = require('../lib');

celery.on('delay :seconds', function(data)
{
    console.log("delaying for %s seconds", data.seconds);
    
    setTimeout(function(self)
    {
        if(!self.next()) console.log("done!");
    }, Number(data.seconds) * 1000, this);
});


celery.on('delay 1 -> say hello :name', function(data)
{
   console.log('hello %s!', data.name); 
});

celery.open();