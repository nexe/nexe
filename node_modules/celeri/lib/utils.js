exports.padLeft = function(buffer, n, char)
{
    return exports.repeat(char, n) + buffer;
}

exports.padRight = function(buffer, n, char)
{
    return buffer + exports.repeat(char, n);
}


//pad on left & right
exports.pad = function(buffer, ln, char, rn)
{
    return exports.repeat(char, ln) + buffer + exports.repeat(char, rn || ln);
}


exports.fill = function(leftChar, ln, rightChar, rn)
{
    return exports.repeat(leftChar, ln) + exports.repeat(rightChar, rn);
}


exports.repeat = function(char, n)
{
    var buffer = '';
    
    for(var i = Math.abs(n); i--;)
    {
        buffer += char;
    }
    
    return buffer;
}            

exports.objectSize = function(target)
{
	var n = 0;
	
	for(var i in target) n++;
	
	return n;
}