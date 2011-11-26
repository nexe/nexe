var celeri = require('../lib');


celeri.exec('ls', ['-help'], {
    exit: function()
    {
        console.log("DONE");
    }
});

celeri.open();