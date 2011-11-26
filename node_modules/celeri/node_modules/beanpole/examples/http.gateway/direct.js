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
    
    'push -public spice.io/theurld/ready': function()
    {
        console.log("READY");
    }
});

router.require(['http.server', 'http.gateway','hook.http','hook.core']);


router.push('init');

router.push('hook/add','http://theurld.spice.io');



