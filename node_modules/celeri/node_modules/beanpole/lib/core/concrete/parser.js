
var Structr = require('structr');

/**
 * parses syntactic sugar. 

 Why the hell are you using a parser for something so simple?  Because I wanted to. Yeah, I could have done it in Regexp, but fuck that >.>... This
 Is much more fun.
 */



//follow the pattern below when adding tokens plz.

var Token = {

 	// A-Z
 	WORD: 1, 

 	// -metadata
 	METADATA: 1 << 1,
    
    
 	// =
 	PATH: 1 << 2,


 	// :param
 	PARAM: 1 << 3, 

 	// ->
 	TO: 1 << 4,

 	// for routing
 	BACKSLASH: 1 << 5,

 	// .
 	DOT: 1 << 6, 

 	// * - this is an auto-middleware
 	STAR: 1 << 7,

 	// "or"
 	OR: 1 << 8,

 	// (
 	LP: 1 << 9,

 	// )
 	RP: 1 << 10,

 	// =
 	EQ: 1 << 11,
    

 	//whitespace
 	WHITESPACE: 1 << 12
};


//reserved keywords
var Reversed = {
	or: Token.OR
}


var Tokenizer = function()
{

	//source of the string to tokenize
	var source = '',

	//the position of the parser
	pos = 0,

	//the current token
	currentToken,

	self = this;


	/**
	 * getter / setter for the source
	 */

	this.source = function(value)
	{
		if(value)
		{
			source = value+' '; //padding
			pos = 0;
		}

		return source;
	} 

	/**
	 * next token
	 */

	this.next = function(keepWhite)
	{
		return currentToken = nextToken(keepWhite);
	}

	/**
	 */

	this.peekChars = function(n)
	{
		return source.substr(pos, n);
	}



	/**
	 */

	this.current = function(keepWhite)
	{
		return currentToken || self.next(keepWhite);
	}


	/**
	 */

	this.position = function()
	{
		return pos;
	}

	/**
	 */

	var nextToken = function(keepWhite, ignoreError)
	{
		if(!keepWhite) skipWhite();

		if(eof()) return null;
		
		var c = currentChar(), ccode = c.charCodeAt(0);

		if(isWhite(ccode))
		{

			skipWhite();
			return token(' ',Token.WHITESPACE);
		}

		//a-z0-9
		if(isAlpha(ccode))
		{
			var w = nextPath();

			return token(w, Reversed[w.toLowerCase()] || Token.WORD);
		}
		


		switch(c)
		{

			//for middleware
			case '-':
				if(nextChar() == '>') return token('->', Token.TO, true);
				if(isAlpha(currentCharCode())) return token(nextPath(), Token.METADATA); 

				error();

			//parameters for routes
			case ':':
				if(isAlpha(nextCharCode())) return token(nextPath(), Token.PARAM);

				error();

			case '/': return token('/', Token.BACKSLASH, true);
			case '.': return token('.', Token.DOT, true);
			case '*': return token('*', Token.STAR, true);
			case '(': return token('(', Token.LP, true);
			case ')': return token(')', Token.RP, true);
			case '=': return token('=', Token.EQ, true);
            
            //path part
			default: return token(nextPath(), Token.PATH);
		}

		//eof
		return null;
	}

	var error = function()
	{
		throw new Error('Unexpected character "'+currentChar()+'" at position '+pos+' in "'+source+'"');
	}

	/**
	 */

	var token = function(value, type, skipOne)
	{
		if(skipOne) nextChar();


		return { value: value, type: type };
	}


	/**
	 */

	var nextChar = this.nextChar = function()
	{
		return source[++pos];
	}

	/**
	 */

	var currentChar = this.currentChar = function()
	{
		return source[pos];
	}

	/**
	 */

	var isAlpha = this.isAlpha = function(c)
	{
		return (c > 96 && c < 123) || (c > 64 && c < 91) || isNumber(c) || c == 95;
	}

	/**
	 */

	var isWhite = this.isWhite = function(c)
	{
		return c == 32 || c == 9 || c == 10;
	}

	/**
	 */

	var isNumber = this.isNumber = function(c)
	{
		return c > 47 && c < 58;
	}

	/**
	 */

	var nextCharCode = function()
	{
		return nextChar().charCodeAt(0);
	}
	/**
	 */

	var currentCharCode = function()
	{
		return currentChar().charCodeAt(0);
	}

	/**
	 */

	var rewind = function(steps)
	{
		pos -= (steps || 1);
	}


	/**
	 */

	var skipWhite = function()
	{
		var end = false;

		while(!(end = eof()))
		{
			if(!isWhite(currentCharCode())) break;

			nextChar();
		}
		return !end;
	}


	/**
	 */

	var nextNumber = function()
	{
		var buffer = currentChar();

		while(!eof())
		{
			if(isNumber(nextCharCode()))
			{
				buffer += currentChar();
			}
			else
			{
				break;
			}
		}

		return buffer;
	}
    

	/**
	 */

	var nextPath = function()
	{
		var buffer = currentChar();

		while(!eof())
		{
			if(!isWhite(nextCharCode()) && !currentChar().match(/[\/=()]/g))
			// if(isAlpha(nextCharCode()) || isNumber(currentCharCode()))
			{
				buffer += currentChar();
			}
			else
			{
				break;
			}
		}

		return buffer;
	}


	/**
	 * end of file
	 */

	var eof = function()
	{
		return pos > source.length-2;
	}
}


var ChannelParser = function()
{
	var tokenizer = new Tokenizer(),
		cache = {};
	
	/**
	 * parses a string into a handleable expression
	 */

	this.parse = function(source)
	{
		if(!source) throw new Error('Source is not defined');

		//stuff might have happened to the expression, so we need to clone it. it DEFINITELY changes
		//when pull requests are made...
		if(cache[source]) return Structr.copy(cache[source]);
		
		tokenizer.source(source);

		return Structr.copy(cache[source] = rootExpr());
	}


	var rootExpr = function()
	{
		var expr = tokenizer.current(),
			type,
			meta = {};
		//type is not defined, but that's okay!
		
		if(expr.type == Token.WORD && tokenizer.isWhite(tokenizer.peekChars(1).charCodeAt(0)) && tokenizer.position() < tokenizer.source().length-1)
		{
			type = expr.value;
			tokenizer.next();
		}

		var token, channels = [];

		while(token = tokenizer.current())
		{
			switch(token.type)
			{

				//-metadata=test
				case Token.METADATA:
					meta[token.value] = metadataValue();
				break;

				case Token.BACKSLASH:
				case Token.WORD:
				case Token.STAR:
					channels = channels.concat(channelsExpr());
				break;
				case Token.OR:
					tokenizer.next();
				break;
				default:
					tokenizer.next();
				break;
			}
		}

		return { type: type, meta: meta, channels: channels };
	}

	var metadataValue = function()
	{
		if(tokenizer.currentChar() == '=')
		{
			tokenizer.next();
			var v = tokenizer.next().value;
			tokenizer.next();
			return v;
		}

		tokenizer.next();

		return 1;
	}

	var channelsExpr = function()
	{
		var channels = [],
			to;


		while(hasNext())
		{

			if(currentTypeIs(Token.LP))
			{
				tokenizer.next();
			}
            
            

			if(currentTypeIs(Token.WORD | Token.PARAM | Token.STAR | Token.BACKSLASH))
			{
				channels.push([channelPathsExpr()]);

				while(currentTypeIs(Token.OR))
				{
					tokenizer.next();
					channels[channels.length-1].push(channelPathsExpr());
				}
			}
			else
			{
				break;
			}


			if(currentTypeIs(Token.RP))
			{
				tokenizer.next();
			}

			if(currentTypeIs(Token.TO))
			{
				tokenizer.next();
			}
		}


		var _orChannels = splitChannelExpr(channels.concat(), []),
		channelsThru = [];

		for(var i = _orChannels.length; i--;)
		{
			var chain =  Structr.copy(_orChannels[i]),
			current = channel = chain[chain.length-1];
			
			for(var j = chain.length-1; j--;)
			{
				current = current.thru = chain[j];
			}


			channelsThru.push(channel);
		}

		return channelsThru;
	}

	var splitChannelExpr = function(orChannels, stack)
	{
		if(!orChannels.length) return [stack];

		var current = orChannels.shift();

		if(current.length == 1)
		{
			stack.push(current[0]);

			return splitChannelExpr(orChannels, stack);
		}
		else
		{
			var split = [];

			for(var i = current.length; i--;)
			{
				var stack2 = stack.concat();

				stack2.push(current[i]);

				split = split.concat(splitChannelExpr(orChannels.concat(), stack2));
			}

			return split;
		}

	}

	var channelPathsExpr = function(type)
	{
		var paths = [],
		token,
		isMiddleware = false,
		cont = true;

		while(cont && (token = tokenizer.current()))
		{

			switch(token.type)
			{
				case Token.WORD:
				case Token.PARAM:
				case Token.PATH:
					paths.push({ name: token.value, param: token.type == Token.PARAM });
				break;
				case Token.BACKSLASH:
				break;
				default:
					cont = false; 
				break;
			}

			if(cont) tokenizer.next();
		}

		if(currentTypeIs(Token.STAR))
		{
			isMiddleware = true;
			tokenizer.next();
		}


		return { paths: paths, isMiddleware: isMiddleware };
	}


	var currentToken = function(type, igError)
	{
		return checkToken(tokenizer.current(), type, igError);
	}
	
	var nextToken = function(type, igError, keepWhite)
	{
		return checkToken(tokenizer.next(keepWhite), type, igError);
	}

	var checkToken = function(token, type, igError)
	{	
		if(!token || !(type & token.type))
		{
			if(!igError) throw new Error('Unexpected token "'+(token || {}).value+'" at position '+tokenizer.position()+' in '+tokenizer.source());
			
			return null;
		}

		return token;
	}

	var currentTypeIs = function(type)
	{
		var current = tokenizer.current();

		return current && !!(type & current.type);
	}

	var hasNext = function()
	{
		return !!tokenizer.current();
	}
}

exports.parse = new ChannelParser().parse;