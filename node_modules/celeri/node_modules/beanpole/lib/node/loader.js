var Structr = require('structr'),
Loader  = require('../core/loader'),
fs = require('fs'),
pt = require('path');
                         
//let coffeescript inject require hooks   
require('coffee-script');

function unableToLoad(bean)
{
    console.error('Unable to load bean "%s"', bean);
}                     
                  

//replaces relative paths, with abs paths for beans. Primarily used for the package.json
//config
function replaceRelWithAbsPath(config, cwd)
{
	for(var property in config)
	{
		var value = config[property];
		
		if(typeof value == 'string' && value.substr(0,2) == './')
		{                                                   
			config[property] = fs.realpathSync(cwd+value.substr(1));    
		}                  
		else
		if(value instanceof Object)
		{
			replaceRelWithAbsPath(value, cwd);
		}
	} 
	                       
	
	return config;
}
    

//quick, temporary fix for node > 5.x. breaks  
try
{
	require.paths.unshift(__dirname + '/beans');
}
catch(e)
{
	
}
var NodeLoader = Loader.extend({
	
	/**
	 */


	'override __construct': function()
	{
		this._super();
		
		this._loaded = [];
	},

	/**
	 */

	'override _require': function(source)
	{	
		if(!this._super(source))
		{
			if(typeof source == 'object')
			{
				for(var bean in source)
				{
					this._require2(bean).plugin(this, source[bean]);
				}
			}
			else
			if(typeof source == 'string')
			{
				var bean, self = this, basename = pt.basename(source);
                
                
                if(basename == 'package.json')
                {
                    var pkg = JSON.parse(fs.readFileSync(source, 'utf8'));
                    
                    for(var bean in pkg.beans)
                    {
                        var params = pkg.beans[bean],
                        plugin = self._require2(bean);
                        
                        
                        if(!plugin)
                        {
                            unableToLoad(bean);
                            continue;
                        }                   
						
                        
                        plugin.plugin(self, replaceRelWithAbsPath(typeof params != 'boolean' ? params : self._params[bean] || {}, pt.dirname(source)));
                    }
                }
				else
				if(!(bean = this._require2(source)))
				{
					try
					{
						
						//NOT a bean, but a directory for the beans.
						fs.readdirSync(source).forEach(function(name)
						{
							//hidden file
							if(name.substr(0,1) == '.') return;

							self._require2(source + '/' + name).plugin(self, self._params[name] || {});
						});
					}
					catch(e)
					{          
						console.log(e.stack)               
						console.warn('Unable to load beans from directory %s', source);
                        unableToLoad(source);
					}				
				}
				else
				{
					bean.plugin(this, self._params[source.split('/').pop()] || {});
				}
			}
			else
			{
				return false;
			}
			
			return this;
		}

		//this gets hit if old require is true
		return this;
	},
	
	/**
	 */

	'_require2': function(bean)
	{
		try
		{
			var path = require.resolve(bean);
		}
		catch(e)
		{
			return false;
		}
		
		var ret = require(bean),
		name = pt.dirname(path).split('/').pop();


		if(this._loaded.indexOf(path) > -1)
		{
			console.notice('Cannot reload bean "%s"', bean);
			
			return { plugin: function() {} };
		}
		
		this._loaded.push(path);
		
		return ret;
	}
});

module.exports = NodeLoader;
