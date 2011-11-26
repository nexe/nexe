var beanpole = require('../../lib/node');


var router = beanpole.router();


router.params({
    'http.gateway': {
        http:{
            port: 8082
        }
    }
});


router.on({

    'pull -http hello': function()
    {
        return "Hello world!";
    },
    
    'push -public head/ready': function()
    {
        console.log("READ READY");
    }
});

router.require(['http.server', 'http.gateway','hook.http.mesh2','hook.core']);


router.push('init');
router.push('ready','hook');

router.pull('hooks/add', 'http://localhost:8080', function(){});



