var tty = require('tty'),
fs = require('fs'),
Structr = require('structr'),
beanpole = require('beanpole'),
_buffer = '',
router = beanpole.router();

exports.utils = require('./utils');


//CLEAN ME!!!!!!!!!!!!!!!!!

_delimiterRepl = /\s+/g,
_delimiter = ' ';
                    

var _queue = [],
_queueRunning = false;
 

/**
 * queued commands
 */

exports.next = function(callback)
{   
	exports.queue(callback)();
	
	return this;
}


exports.queue = function(callback)
{         
	return function()
	{               
		var args = arguments,  
		listeners = [],
		self = {
			next: function()
			{   
				var args = arguments;
				           
				listeners.forEach(function(listener)
				{
					listener.apply(null, args);
				})                
				 
				_queueRunning = true;    
				if(_queue.length)
				{
					_queue.shift()();
				}
				else
				{
					_queueRunning = false;
				}
			},
			attach: function(callback)
			{
				listeners.push(callback);
			}
		}
		
		_queue.push(function()
		{                              
			callback.apply(self, args);
		});
		    
		
		if(!_queueRunning)
		{                     
			self.next();
		}                        
		
		return exports;
	}                     
	
	return exports;
}

/**
 * spacing between arguments
 */
 
exports.delimiter = function(value)
{
    if(!arguments.length) return _delimiter;
    
    _delimiterRepl = new RegExp(value + '+','ig');
    
    return _delimiter = value;
};


/**
 * Converts CLI arguments to beanpole routes. Nifty huh?
 */
 
function _toRoute(type)
{
    return type.replace(_delimiterRepl, '\/');
}



/**
 * size of the terminal window
 */
  
exports.size = function()
{
    return tty.getWindowSize();
}

/**
 * number of columns in the terminal window (characters / width)
 */
 
exports.columns = function()
{
    return exports.size()[1] || exports.size();
}

/**
 * number of rows in the terminal window
 */

exports.rows = function()
{
    return exports.size()[0];
}

var _inputPrefix = '> ';

exports.inputPrefix = function(prefix)
{
    if(!arguments.length) return _inputPrefix;
    
    
    return _inputPrefix = prefix || '';
}


exports.on = function(type, callback)
{

    if(typeof type == 'object')
    {
        var disposables = [];
        
        if(type instanceof Array)
        {
            for(var i = type.length; i--;)
            {
                disposables.push(exports.on(type[i], callback));
            }
        }
        else
        {
            for(var t in type)
            { 
                
                disposables.push(exports.on(t, type[t]));
            }
        }
        
        
        
        return {
            dispose: function()
            {
                disposables.forEach(function(disposable)
                {
                    disposable.dispose();
                });
            }
        };
    }
        
    return router.on('push /'+_toRoute(type), callback);
    
}

exports.emit = function(type, data)
{
   
    //catch parse errors
    try
    {
        return router.push(_toRoute(type), data, { meta: { passive: 1 } });
    }
    catch(e)
    {
        //console.log(e.stack);
    }   
    
    return false;

}


exports.buffer = function(value, ignoreReplace)
{
    if(!arguments.length) return _buffer;
    
    _buffer = value;
    
    return !ignoreReplace ? exports.replaceLine(value) : value;
}

/**
 * Replaces the current line in the terminal window
 */
 
exports.replaceLine = function(buffer, cursorTo)
{

    //need to clear the line before replacing it
    process.stdout.clearLine();
    
    //set the cursor to zero, otherwise we'll have padding we don't want
    exports.cursor(0);
    
    //write the buffer
    process.stdout.write(buffer);
    
    //set the cursor to the new position!
    exports.cursor(cursorTo != undefined ? cursorTo : buffer.length);
    
    return _buffer = buffer;
}


/**
 * inserts text into the current line
 */
 
exports.insertText = function(str, position)
{
    var buffer = exports.buffer();
    exports.replaceLine(buffer.substr(0, position) + str + buffer.substr(position), position + str.length);
} 


/**
 * Takes a chunk of text out of the current line
 */
 
exports.spliceLine = function(position, length, newCursor)
{
    
    var buffer = exports.buffer();
    exports.replaceLine(buffer.substr(0, position) + buffer.substr(position + length), newCursor);
}

var _cursorPosition = 0;


/**
 */
 
exports.cursor = function(position)
{
   if(!arguments.length) return _cursorPosition;
   
   
   process.stdout.cursorTo(position);
   
   return _cursorPosition = position;
}



function stringRep(key)
{
    var chain = '';
    
    for(var prop in key)
    {
        if(!key[prop]) continue;
        
        if(key[prop] == true)
        {
            chain = prop+'-'+chain;
        }
        else
        {
            chain += key.name;
        }
    }
        
    return chain;
}

exports.write = function(string)
{
    process.stdout.write(string);
}

exports.newLine = function(buffer)
{
    if(buffer) exports.write(buffer);
    exports.write('\n');
    exports.buffer('');
}

exports.open = function(ops)
{
    if(ops)
    {
        if(ops.prefix) exports.inputPrefix(ops.prefix);
        if(ops.delimiter) exports.delimiter(ops.delimiter);
    }
    
    if(exports.opened) return;
    exports.opened = true;
    
    
	stdin = process.openStdin();
    stdin.setEncoding('utf8');    
    tty.setRawMode(true);
    
    
    
    stdin.on('keypress', function(c, key)
    {
        
        //integer?
        if(!key) key = { name: c.toString() }
        
        
        
        
        var chain = stringRep(key),
        emitSuccess = exports.emit(chain); 
        
        
        //not a handled item to boot? Probably enter, delete, left, right, up, etc. Append it.
        if(!emitSuccess && c)
        {
            if(!_buffer.length)
            {
                exports.insertText(exports.inputPrefix(), _cursorPosition);
            }
            exports.insertText(c, _cursorPosition);
            //exports.insertText(c, Math.max(_cursorPosition, exports.inputPrefix().length));
        }
        
        
        //new line? reset
        if(key && key.name == 'enter')
        {
            //exports.replaceLine(exports.buffer().magenta);
            process.stdout.write('\n');
            _buffer = '';
            _cursorPosition = 0;
            //exports.insertText(exports.inputPrefix(), _cursorPosition);
            //exports.cursor(0);
        }
        
        
        //for custom handlers: password, confirm, etc.
        exports.emit('keypress', { char: c, key: key });
        
        //character code? 
        if(key.name.length == 1)
        {
            exports.emit('charpress', c);
        }
        
        
    });
}


exports.parse = function(args)
{
    var self = this;
    
    args.forEach(function(arg)
    {  
        var argParts = arg.split(':');
        
        for(var i = argParts.length; i--;)
        {
            argParts[i] = encodeURIComponent(argParts[i]);
        }
        self.emit(argParts.join('/'));
    });
}
    




fs.readdirSync( __dirname + '/modules').forEach(function(module)
{                    
	
    require( __dirname + '/modules/'+module).plugin(exports);
});