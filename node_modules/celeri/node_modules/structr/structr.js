var Structr = function (target, parent)
{
	if (!parent) parent = Structr.fh({});

	var that = Structr.extend.apply(null, [parent].concat(target))

	that.__construct.prototype = that;

	if(!that.__construct.extend)
	//allow for easy extending.
	that.__construct.extend = function()
	{
		return Structr(Structr.argsToArray(arguments), that);
	};

	//return the constructor
	return that.__construct;
}; 


Structr.argsToArray = function(args)
{
	var ar = new Array(args.length);
	for(var i = args.length; i--;) ar[i] = args[i];
	return ar;
}

Structr.copy = function (from, to, lite)
{
	if(typeof to == 'boolean')
	{
		lite = to;
		to = undefined;
	}
	
	if (!to) to = from instanceof Array ? [] : {};  
	
	var i;

	for(i in from) 
	{
		var fromValue = from[i],
		toValue = to[i],
		newValue;

		//don't copy anything fancy other than objects and arrays. this could really screw classes up, such as dates.... (yuck)
		if (!lite && typeof fromValue == 'object' && (!fromValue || fromValue.__proto__ == Object.prototype || fromValue.__proto__ == Array.prototype)) 
		{

			//if the toValue exists, and the fromValue is the same data type as the TO value, then
			//merge the FROM value with the TO value, instead of replacing it
			if (toValue && fromValue instanceof toValue.constructor)
			{
				newValue = toValue;
			}

			//otherwise replace it, because FROM has priority over TO
			else
			{
				newValue = fromValue instanceof Array ? [] : {};
			}

			Structr.copy(fromValue, newValue);
		}
		else 
		{
			newValue = fromValue;
		}

		to[i] = newValue;
	}

	return to;
};


//returns a method owned by an object
Structr.getMethod = function (that, property)
{
	return function()
	{
		return that[property].apply(that, arguments);
	};
};     

Structr.wrap = function(that, prop)
{
	if(that._wrapped) return that;

	that._wrapped = true;

	function wrap(target)
	{
		return function()
		{
			return target.apply(that, arguments);
		}
	}

	if(prop)
	{
		that[prop] = wrap(target[prop]);
		return that;	
	}

	for(var property in that)
	{
		var target = that[property];
			
		if(typeof target == 'function')
		{
			that[property] = wrap(target);
		}
	}

	return that;
}  

//finds all properties with modifiers
Structr.findProperties = function (target, modifier)
{
	var props = [],
		property;

	for(property in target)
	{
		var v = target[property];

		if (v && v[modifier])
		{
			props.push(property);
		}
	}

	return props;
};

Structr.nArgs = function(func)
{
	var inf = func.toString().replace(/\{[\W\S]+\}/g, '').match(/\w+(?=[,\)])/g);
	return inf ? inf.length :0;
}

Structr.getFuncsByNArgs = function(that, property)
{
	return that.__private['overload::' + property] || (that.__private['overload::' + property] = {});
}

Structr.getOverloadedMethod = function(that, property, nArgs)
{
	var funcsByNArgs = Structr.getFuncsByNArgs(that, property);
	
	return funcsByNArgs[nArgs];
}

Structr.setOverloadedMethod = function(that, property, func, nArgs)
{
	var funcsByNArgs = Structr.getFuncsByNArgs(that, property);
	
	if(func.overloaded) return funcsByNArgs;
	
	funcsByNArgs[nArgs || Structr.nArgs(func)] = func;
	
	return funcsByNArgs;
}

//modifies how properties behave in a class
Structr.modifiers =  {

	/**
	* overrides given method
	*/

	m_override: function (that, property, newMethod)
	{
		var oldMethod = (that.__private && that.__private[property]) || that[property] || function (){},
			parentMethod = oldMethod;
		
		if(oldMethod.overloaded)
		{
			var overloadedMethod = oldMethod,
				nArgs = Structr.nArgs(newMethod);
			parentMethod = Structr.getOverloadedMethod(that, property, nArgs);
		}
		
		//wrap the method so we can access the parent overloaded function
		var wrappedMethod = function ()
		{
			this._super = parentMethod;
			var ret = newMethod.apply(this, arguments);
			delete this._super;
			return ret;
		}
		
		if(oldMethod.overloaded)
		{
			return Structr.modifiers.m_overload(that, property, wrappedMethod, nArgs);
		}
		
		return wrappedMethod;
	},


	/**
	* getter / setter which are physical functions: e.g: test.myName(), and test.myName('craig')
	*/

	m_explicit: function (that, property, gs)
	{
		var pprop = '__'+property;

		//if GS is not defined, then set defaults.
		if (typeof gs != 'object') 
		{
			gs = {};
		}

		if (!gs.get) 
		gs.get = function ()
		{
			return this._value;
		}

		if (!gs.set) 
		gs.set = function (value)
		{
			this._value = value;
		}


		return function (value)
		{
			//getter
			if (!arguments.length) 
			{
				this._value = this[pprop];
				var ret = gs.get.apply(this);
				delete this._value;
				return ret;
			}

			//setter
			else 
			{
				//don't call the gs if the value isn't the same
				if (this[pprop] == value ) 
				return;

				//set the current value to the setter value
				this._value = this[pprop];

				//set
				gs.set.apply(this, [value]);

				//set the new value. this only matters if the setter set it 
				this[pprop] = this._value;
			}
		};
	},

    /**
 	 */

	m_implicit: function (that, property, egs)
	{
		//keep the original function available so we can override it
		that.__private[property] = egs;

		that.__defineGetter__(property, egs);
		that.__defineSetter__(property, egs);
	},
	
	/**
	 */
	
	m_overload: function (that, property, value, nArgs)
	{                    
		var funcsByNArgs = Structr.setOverloadedMethod(that, property, value, nArgs);
				
		var multiFunc = function()
		{          
			var func = funcsByNArgs[arguments.length];
			
			if(func)
			{
				return funcsByNArgs[arguments.length].apply(this, arguments);
			}             
			else
			{
				var expected = [];
				
				for(var sizes in funcsByNArgs)
				{
					expected.push(sizes);
				}
				
				throw new Error('Expected '+expected.join(',')+' parameters, got '+arguments.length+'.');
			}
		}    
		
		multiFunc.overloaded = true;                                          
		
		return multiFunc; 
	}
}               


//extends from one class to another. note: the TO object should be the parent. a copy is returned.
Structr.extend = function ()
{
	var from = arguments[0],
	to = {};

	for(var i = 1, n = arguments.length; i < n; i++)
	{
		var obj = arguments[i];

		Structr.copy(obj instanceof Function ? obj() : obj, to);
	}


	var that = {
		__private: {

			//contains modifiers for all properties of object
			propertyModifiers: {}
		}
	};


	Structr.copy(from, that);

	var usedProperties = {},
	property;

	for(property in to) 
	{
		var value = to[property];


		var propModifiersAr = property.split(' '), //property is at the end of the modifiers. e.g: override bindable testProperty
		propertyName = propModifiersAr.pop(),

		modifierList = that.__private.propertyModifiers[propertyName] || (that.__private.propertyModifiers[propertyName] = []);
                                
             
		if (propModifiersAr.length) 
		{
			var propModifiers = {};
			for(var i = propModifiersAr.length; i--;) 
			{
				var modifier = propModifiersAr[i];

				propModifiers['m_' + propModifiersAr[i]] = 1;

				if (modifierList.indexOf(modifier) == -1)
				{
					modifierList.push(modifier);
				}
			}      
			
			if(propModifiers.m_merge)
			{
				value = Structr.copy(from[propertyName], value);
			}             

			//if explicit, or implicit modifiers are set, then we need an explicit modifier first
			if (propModifiers.m_explicit || propModifiers.m_implicit) 
			{
				value = Structr.modifiers.m_explicit(that, propertyName, value);
			}

			if (propModifiers.m_override) 
			{
				value = Structr.modifiers.m_override(that, propertyName, value);
			}

			if (propModifiers.m_implicit) 
			{
				//getter is set, don't continue.
				Structr.modifiers.m_implicit(that, propertyName, value);
				continue;
			}
		}

		for(var j = modifierList.length; j--;)
		{
			value[modifierList[j]] = true;
		}
		
		if(usedProperties[propertyName])
		{                       
			var oldValue = that[propertyName];
			
			//first property will NOT be overloaded, so we need to check it here
			if(!oldValue.overloaded) Structr.modifiers.m_overload(that, propertyName, oldValue, undefined);
			 
			value = Structr.modifiers.m_overload(that, propertyName, value, undefined);
		}	
		
		usedProperties[propertyName] = 1;

		that.__private[propertyName] = that[propertyName] = value;
	}

	//if the parent constructor exists, and the child constructor IS the parent constructor, it means
	//the PARENT constructor was defined, and the  CHILD constructor wasn't, so the parent prop was copied over. We need to create a new function, and 
	//call the parent constructor when the child is instantiated, otherwise it'll be the same class essentially (setting proto)
	if (that.__construct && from.__construct && that.__construct == from.__construct)
	{
		that.__construct = Structr.modifiers.m_override(that, '__construct', function()
		{
			this._super.apply(this, arguments);
		});
	}
	else
	if(!that.__construct)
	{
		that.__construct = function() {};
	}


	//copy 
	for(var property in from.__construct)
	{
		if(from.__construct[property]['static'] && !that[property])
		{
			that.__construct[property] = from.__construct[property];
		}
	}

     
	var propertyName;
	
	//apply the static props
	for(propertyName in that) 
	{
		var value = that[propertyName];

		//if the value is static, then tack it onto the constructor
		if (value && value['static'])
		{
			that.__construct[propertyName] = value;
			delete that[propertyName];
		}                                                                  
	}



	return that;
}


//really.. this isn't the greatest idea if a LOT of objects
//are being allocated in a short perioud of time. use the closure
//method instead. This is great for objects which are instantiated ONCE, or a couple of times :P.
Structr.fh = function (that)
{
	that = Structr.extend({}, that);

	//deprecated
	that.getMethod = function (property)
	{
		return Structr.getMethod(this, property);
	}

	that.extend = function ()
	{
		return Structr.extend.apply(null, [this].concat(arguments))
	}

	//copy to target object
	that.copyTo = function (target, lite)
	{
		Structr.copy(this, target, lite);
	}   

	//wraps the objects methods so this always points to the right place
	that.wrap = function(property)
	{
		return Structr.wrap(this, property);
	}

	return that;
}
                                        
module.exports = Structr;

