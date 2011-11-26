var beanpole = require('../../lib/node');

var router = beanpole.router();



router.on({
    /**
     */
     
    'pull /*': function()
    {
        console.log("THRU");
        
        this.next();
    },
    
     /**
     */
     
    'pull -two /*': function()
    {
        console.log("THRU MOO");
        
        this.next();
    },
    
    /**
     */
     
    'pull -two /hello/*': function()
    {
        console.log("THRU hoo");
        
        this.next();
    },
    
    /**
     */
     
    'pull /hello/param/*': function()
    {
        console.log("THRU AGAIN");
        this.next();
    },
     
    /**
     */
     
    'pull -t /hello/param/*': function()
    {
        console.log("THRU AGAIN");
        this.next();
    },
    
     /**
     */
     
    'pull -t2 /hello/param/*': function()
    {
        console.log("THRU AGAIN");
        this.next();
    },
    
     /**
     */
     
    'pull -t3 /hello/param/*': function()
    {
        console.log("THRU AGAIN");
        this.next();
    },
    
    
    /**
     */
     
    'pull hello/param': function()
    {
        console.log("HELLO!");
    }
});


router.pull('hello/param', function()
{
});