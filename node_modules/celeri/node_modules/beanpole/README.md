## Beanpole - Routing framework      
               

### What are some features?
	
- Syntactic sugar (see below).                                         
- Works with many protocols: amqp, http, websockets, etc.                      
- Hooking with other applications is a breeze with [daisy](https://github.com/spiceapps/daisy).   
- Works well with coffeescript 


### Projects using Beanpole

- [celeri](https://github.com/spiceapps/celeri) - CLI library
- [bonsai](https://github.com/spiceapps/bonsai) - application server
- [leche](https://github.com/spiceapps/leche) - Framework to build frontend / backend applications with the same code.
- [daisy](https://github.com/spiceapps/daisy) - Expose beanpole to: http, websockets, amqp (rabbitmq), etc.    
- [beandocs](https://github.com/spiceapps/beandocs) - Generate documentation from your beanpole route comments.
- [beanprep](https://github.com/spiceapps/beanprep) - Scans beans in a given directory, and installs their dependencies. 
- [cupboard](https://github.com/spiceapps/beanprep) - Reverse package manager.       

### Beanpole ports

- [Actionscript](https://github.com/spiceapps/beanpole.as)  
- [C++](https://github.com/spiceapps/beanpoll)     

### Overview          


![Alt ebnf diagram](http://i.imgur.com/v1wdO.png)
                

The basic route consists of a few parts: the `type` of route, and the `channel`. Here are some examples:

	router.on('pull hello/:name', ...);
	
and

	router.on('push hello/:name', ...);           
	

#### Push Routes:  

- Used to broadcast a message, or change (1 to many).
- Doesn't expect a response.    
- Multiple listeners per route.         

#### Pull Routes:

- Used to request data from a particular route (1 to 1).
- Expects a response.
- One listener per route. 
- examples:
	- request to http-exposed route       
	
	
	                                                   
Using both `push`, and `pull` allows you to **bind** to a particular route. For example:


````javascript
	    
var _numUsers = 0; 
        

//numUser getter / setter function
function numUsers(value)
{
	if(!arguments.length) return _numUsers;
	
	_numUsers = value;
	                     
	router.push('users/online', value);
}


//the request handler. This could be called in-app. It's also just as easily exposable as an API to http, websockets, etc.
router.on('pull users/online', function(request)
{
	request.end(numUsers());
});                                                    
          
//pull num users initially, then listen for when num users changes.
router.on('push -pull users/online', function(response)
{         
	//handle change here..
	console.log(response); //0, 3, 10...
});                                        
                               
           

//triggers above listener
numUsers(3);
numUsers(10);

````        

Okay, so you might have noticed I added something funky here: `-pull` - that's a tag. Tags are structured like so:

   	router.on('pull -tagName hello/:route', ...);

or, you can add a value to it:

	router.on('pull -method=GET hello/:route', ...);
	
As mentioned above, you can only have *one* listener per `pull` route. HOWEVER, you can have multiple listeners per `pull` route *if* you provide different tag values. For example:

````javascript

router.on({

	/**      
	 * returns the given user
	 */
	
	'pull -method=GET users/:userId': function(request)
	{                           
		//get the specific user  
	},
	
	/**   
	 * updates a user   
	 */
	
	'pull -method=UPDATE users/:userId': function(request)
	{
		//update user here
	},
	
	/** 
	 * deletes a user
	 */
	
	'pull -method=DELETE users/:userId': function(request)
	{
		//delete user 
	}                         
	
}); 
````       

The above chunk of code is well suited for a REST-ful api without explicilty writing it *for* an http server. It can be used for any protocol. For example - say I wanted to *delete* a user using the code above:

````javascript

router.pull('users/' + someUserId, { tag: { method: 'DELETE'} }, function()
{
	//delete user response
});  

````                      

You might have guessed - tags can be used to filter routes. Okay, onto something a little more advanced: **middleware**. Here's an example:

````javascript


router.on({
	
	/**
	 */
	
	'pull authorize': function(request)
	{
		if(request.data.secret != 'superSecret')
		{
			request.end('You shall not pass!');
		}                                      
		else
		{             
			
			//onto the next route
			request.next();
		}
	},
	
	/**
	 */
	
	'pull -method=GET authorize -> my/profile': function(request)
	{
		request.end('Super secret stuff!');
	}                      
	
}); 


````
                                          
The token `->` denotes `my/profile` must go *through* the `authorize` route. Here are a few more use-cases: 

````javascript
    
router.on({
	
	/**                
	 */
	
	'pull post/body': function(request)
	{
		//post http request body here. This is implemented in daisy
	},             
	
	/**
	 */
	
	'pull session': function(request)
	{
		//initialize cookies for the user. Again, implemented in daisy
	},
	
	/**
	 */
	
	'pull -method=POST post/body -> session -> upload/video': function()
	{
		//passed through 2 routes before getting here.
	},
	
	/**
	 */
	
	'pull cache/:ttl': function(request)
	{                                           
		//used to check if the *next* route is cached. If it is, then return the value vs continuing 
	},
	
	/**
	 */
	
	'pull cache/10000 -> some/heavy/request': function(request)
	{
		//do some heavy stuff here, but go through the cache route so it's not called on each request
	}                                                                                                
	
	
})

````      

Middleware is especially useful for a REST-ful interface:

````javascript

router.on({
	
	/**  
	 * returns the given user
	 * @example /users/665468459
	 */
	
	'pull users/:userId': function(request)
	{
		getUser(request.data.postId, funciton(user)
		{
			request.user = user; 
			                                            
			//route being used as middleware?
			if(request.hasNext()) return request.next();     
			                  
			//return the user
			request.end(user);
		})
	},
	
	/** 
	 * Returns a post made by a particular user
	 * @example /users/665468459/posts/54353499534
	 */
	
	'pull users/:userId -> users/:userId/posts/:postId': function(request)
	{
		getPosts(request.user, request.data.postId, function(posts)
		{
			request.end(posts);
		})
	}
});
       
````      
           
Middleware can also be specified without using the token: `->`.An example:


````javascript
    
router.on({               
	
	/**
	 */
	
	'pull my/*': function()
	{
		//authorize user
	},  
	
	/**
	 */
	
	'pull my/profile': function()
	{                 
		//goes through authorization first 
	}
});

````                                                                         
                                                                                                
Providing a wildcard `*` tells the router that **anything** after the route must go through it.     


### Methods            

#### router.on(type[,listener])

Listens to the given routes

- `type` - string or object. String would contain the route. Object would contain multiple routes / listeners
- `listener` - function listening to the route given.                                                                                  


#### router.push(route[, data][, options])

- `type` - the channel broadcast a message to.
- `data` - the data to push to the given route
- `options` - options for the given route
	- `meta` - tags to use to filter out listeners
	
#### router.pull(route[, data][, options][, callback])

same as push, but expects a response

#### router.channels()

returns all registered channels

#### router.getRoute(route)
                      
returns route expression

#### request.write(chunk)
             
Initializes a streamed response. Great for sending files

#### request.end([chunk]) 
                        
Ends a response 

#### request.hasNext()
                                                     
Returns TRUE if there's a listener after the current one.

#### request.next()

Moves onto the next route.

#### request.forward(channel, callback)

Forwards the current request to the given channel

#### request.thru(channel[ ,options])
       
Treats the given channel as middleware   

#### request.data

Data is added here  


### One last goodie

Beanpole works well with coffeescript:


````coffeescript

router.on                        
                   
	#
	'pull -method=GET say/hello': ->
		"hello world!"           

````








                                                                                                              

