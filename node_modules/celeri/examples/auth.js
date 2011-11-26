var celery = require('../lib');

celery.prompt('Username: ', function(user)
{
    celery.password('Password: ', function(pass)
    {
        console.log('user: %s'.green, user);
        console.log('pass: %s'.green, pass);
    });
});


celery.open();