


exports.rotator = function(target, meta)
{

	if(!target) target = {};

	target.meta = [meta];
	target.allowMultiple = true;

	target.getRoute = function(ops)
	{
		var route = ops.route,
			listeners = ops.listeners;
            

		//if rotate is specified, then we need to rotate it (round-robin). There's a catch though...
		//because the above *might* have filtered down to metadata values, we need to only rotate what's left, AND
		//the rotate index must be stuck with the routes rotate metadata.
		//Also, if the router can have multiple, then we cannot do round-robin. FUcKs ShiT Up.
		if(!ops.router._allowMultiple && route && route.meta && route.meta[meta] != undefined && listeners.length)
		{                                                         
			route.meta[meta] = (++route.meta[meta]) % listeners.length;

			//only ONE listener now..
			ops.listeners = [listeners[route.meta[meta]]];
		}
        
	}


	target.setRoute = function(ops)
	{
		
	}
}

exports.rotator(exports, 'rotate');
