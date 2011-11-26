var spawn = require('child_process').spawn;

exports.plugin = function(cli)
{

    /**
     * goal = dead simple and painless. 
     */
     
    cli.exec = function(command, args, ops, callback)
    {
        if(typeof args == 'function')
        {
            callback = args;
            args = [];
            ops = {};
        }
        else
        if(!(args instanceof Array))
        {
            callback = ops;
            ops = args;
            args = [];
        }
        
        
    
        if(typeof ops == 'function')
        {
            callback = ops;
            ops = {};
        }
        
        //no callbacks? THEY MUST EXIST!!!!
        if(!callback) callback = ops.callback || ops;
        
        var callbacks = {};
        
        if(typeof callback != 'function')
        {
            callbacks = callback;
        }
        
        if(!callbacks.error) callbacks.error = function(){};
        if(!callbacks.exit) callbacks.exit = function(){};
        if(!callbacks.data) callbacks.data = function(){};
        
        
        var procOps = {
            cwd: ops.cwd,
            env: ops.env,
            customFds: ops.customFds
        };
        
        
        var proc = spawn(command, ops.args || args, procOps), errors = [], buffer = [];
        
        proc.stdout.on('data', function(data)
        {
            buffer.push(data);
            
            callbacks.data(data);
        });
        
        proc.stderr.on('data', function(data)
        {
            errors.push(data);
            
            callbacks.error(data);
        });
        
        proc.on('exit', function(code)
        {
            
            if(typeof callback == 'function') 
            {
                callback(errors.length ? errors.join(' ') : false, buffer.length ? buffer.join(' ') : false);
            }
            else
            if(callbacks.exit)
            {
                callbacks.exit(code);
            }
        });
        
    }
}