var beanpole = require('../../lib/node');


var router = beanpole.router();


router.params({
    'http.gateway': {
        http:{
            port: 8080
        }
    }
});


router.on({

    'pull -http hello': function()
    {
        return "Hello world!";
    },
    
    'push -public hook/ready': function()
    {
        console.log("READY");
    },
    
    'push -public duck': function()
    {
        console.log("DUCK!");
    }
});

router.require(['http.server', 'http.gateway','hook.http.mesh2','hook.core']);


router.push('init');
router.push('ready','head');



