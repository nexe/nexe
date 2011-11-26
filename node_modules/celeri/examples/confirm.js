var celery = require('../lib');

celery.confirm('Do you want to continue?', function(yes)
{
    if(yes)
    {
        console.log("YES!".green);
    }
    else
    {
        console.log("NO!".red);
    }
});


celery.open();