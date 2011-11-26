var celery = require('../lib');

celery.open({  

    //required for middleware / or statements
    //delimiter: '/',
});


var credentials;


 
celery.on('login OR login :user :pass', function(data)
{
    var self = this;
    
    function onAuth(creds)
    {
        if(creds.user != 'user' || creds.pass != 'pass')
        {
            return console.log("Incorrect user / pass".red);
        }
        
        self.user = creds.user;
        
        //cache the credentials so the user doesn't have to login each time
        credentials = creds;
        
        if(!self.next()) console.log("Logged in as %s", creds.user.green);
    }
    
    
    //user already logged in? pass!
    if(credentials)
    {
        onAuth(credentials);
    }
    
    //otherwise check if the user is passed in the route
    else
    if(data.user && data.pass)
    {
        onAuth(data);
    }
    
    //or prompt for authentication
    else
    {
        celery.auth(function(user, pass)
        {
            onAuth({ user: user, pass: pass });
        });
    }
});



/**
 * private account into
 */
 
celery.on('login -> account', function()
{
    console.log('Here\'s your account info %s!', this.user.green);
});


celery.parse(process.argv);