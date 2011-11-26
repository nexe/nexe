utils = require('../utils'),
Structr = require('structr');

//see http://en.wikipedia.org/wiki/Box-drawing_characters
exports.plugin = function(cli)
{      
	
	//┌──   
	//├──
	//└──
	  
	cli.drawTree = cli.tree = function(tree, ops, tab)
	{   
		if(!ops) ops = {};
		
		
		var parts = { };
		
		if(ops.pretty)
		{
			parts = {
				pipe: '|',
				tee: '┬',
				dash: '─',
				leftCorner: '└',
				left: '├',
				branch: utils.repeat('─', 1)
			}
		}
		
		//plays a little more nicely with fonts such as terminus
		else
		{
			parts = {
				pipe: '|',
				tee: '+',
				dash: '-',
				leftCorner: '+',
				left: '|',
				branch: utils.repeat('-', 1)
			}
		}
		
		Structr.copy(ops.parts || {}, parts);
		
		
		parts.tabs = utils.repeat(' ',parts.branch.length+1);
		                         
		
		if(!tab) tab = '';                
		
		var n = utils.objectSize(tree),
		i = 0,
		printedBreak = false;                 
		                                   
		
		for(var index in tree)
		{                                                                                               
			
			var childrenOrValue = tree[index],
			toc = typeof childrenOrValue,
			toi = typeof index, 
			edge = i < n-1 ? parts.left : parts.leftCorner;          
			                                                             
			                            
			var value = !isNaN(Number(index)) ?  childrenOrValue : index + ': ' + childrenOrValue; 
			                           
			                                                                                                            
			console.log('%s%s%s %s', tab, edge, parts.branch + ((toc == 'object') ? parts.tee : parts.dash), toc != 'object' ? value: index); 
			                  
			
			if(toc == 'object')
			{                         
				printedBreak = cli.drawTree(childrenOrValue, ops, n > 1 && i < n-1 ? tab + parts.pipe + parts.tabs.substr(1) : tab + parts.tabs);    
			}
			/*else
			if(toc == 'string' || toc == 'number')
			{                                   
				
			}*/ 
			
			 i++;
		}
		         
		
		//add extra breaks for folders - a little more readable
		if(!printedBreak)
		{
			console.log('%s',tab);
			printedBreak = true;
		}
		
		return printedBreak;                          
	}
}