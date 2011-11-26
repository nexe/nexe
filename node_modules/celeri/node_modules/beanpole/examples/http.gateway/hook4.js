var beanpole = require('../../lib/node');


var router = beanpole.router();


router.params({
    'http.gateway': {
        http:{
            port: 8083
        }
    }
});

var id = Date.now();

console.log(id);


router.on({

    'pull -http hello': function()
    {
        return "Hello world!";
    },
    
    'push -public sibling/ready': function(id)
    {
        console.log("SIBLING READY: " + id);
    },
    
    'push -public hook/ready': function()
    {
        if(this.from == router) return;
        
        this.from.push('sibling/ready', id);
    }
});

router.require(['hook.http.mesh','hook.core']);


router.push('init');
router.push('ready','hook');




