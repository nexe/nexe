var Structr = require('structr');

exports.plugin = function(cli)
{
	function normalizeOptions(ops)
	{
		var cliWidth = cli.columns();
		
		var columns = ops.columns,
		normCols = [],
		vert = ops.vertical   || ops.vert || '  ',
        horz = ops.horizontal || ops.horz || '',
		pad = Structr.copy(ops.pad, { left: 0, right: 0, top: 0, bottom: 0 });
		
		if(ops.padRight) pad.right = ops.padRight;
		if(ops.padLeft) pad.left = ops.padLeft;
		if(ops.padTop) pad.top = ops.padTop;
		if(ops.padBottom) pad.bottom = ops.padBottom;
		if(!ops.width) ops.width = cliWidth;
		
		ops.width = Math.min(ops.width, cliWidth - pad.left - pad.right);
		
        
        if(ops.border)
        {
            if(vert == '  ') vert = ' | ';
            if(horz == '') horz = '–'; 
        }

		
		//sum width of all columns combined
		var sumWidth = 0;
		
		for(var prop in columns)
		{
			var columnValue = columns[prop],
			normCol = { minWidth: 6, align: 'left' },
			tocv = typeof columnValue;
			
			normCols.push(normCol)
			
			//['columnName']
			if(tocv == 'string')
			{
				normCol.name = columnValue;
			}
			else
			{
				//{columnName:value}
				if(typeof prop == 'string')
				{
					normCol.name = prop;
				}


				if(tocv == 'number')
				{
					normCol.width = columnValue;
				}
				else
				if(tocv == 'object')
				{
					Structr.copy(columnValue, normCol);
				}
			}
			
			if(!normCol.width) normCol.width = 100/columns.length;
			
				
			
			sumWidth += normCol.width;
		}	
		
		
		//subtract vert padding
		
		
		var sumActualWidth = 0,
		colsTaken = 0,
		numCols = normCols.length;
		var tableWidth = ops.width - vert.length * numCols;
		
		
		for(var i = 0; i < numCols; i++)
		{ 
			
			var column = normCols[i]/*,
			isLast = i == numCols-1,
			align = column.align;
			
			if(!align)
			{
				column.align = isLast ? 'right' : 'left';
			}*/
			
			var percWidth = Math.round(column.width/sumWidth * tableWidth);
			actualWidth = Math.max(column.minWidth, percWidth),
			
			//diff between calculated perc width, and min width. used for penalization
			difference = actualWidth - percWidth;
			
			sumActualWidth += actualWidth;
			
			
			//this may happen if there are too many minWidths specified. In which case, not all columns
			//will be shown. Actual width will be set to zero
			if(sumActualWidth > ops.width) actualWidth -= Math.min(actualWidth, sumActualWidth - tableWidth);
			
			//actual width CANNOT be less than min width. e.g: single char column couold be huge.
			if(actualWidth < column.minWidth) actualWidth = 0;
			
			column.actualWidth = actualWidth;
			
			//penalize the rest of the columns. Width must *not* cli width
			sumWidth -= difference;
		}
		
		return {
			columns: normCols,
			ellipsis: ops.ellipsis,
			vert: vert,
			horz: horz,
			pad: pad,
			width: ops.width,
			numColumns: numCols,
			showLabels: !!ops.showLabels
		}
	}
	
	function addLines(colLines, value, column)
	{
		var newLines = (value ? value.toString() : '').split(/[\r\n]/g);
		
		for(var i = 0, n = newLines.length; i < n; i++)
		{
			//trim whitespace off the ends. line breaks = whitespace
			var buffer = newLines[i].replace(/^\s+|\s+$/g,'');
			
			var colors = buffer.match(/\u001b\[\d+m/g) || []; 
			
			var padding = column.actualWidth - buffer.length + colors.join('').length;
			
			switch(column.align)
			{
				case 'right':
				buffer = cli.utils.padLeft(buffer, padding, ' ');
				break;

				case 'center':
				buffer = cli.utils.pad(buffer, Math.floor(padding/2), ' ', Math.ceil(padding/2));
				break;

				default: 
				buffer = cli.utils.padRight(buffer, padding, ' ');
				break;
			}
			
			colLines.push(buffer);
		} 
	}
	
	function getRowLineTable(item, ops)
	{
		var lineTable = [],
		numLines = 0,
		cols = ops.numColumns;
		
		
		//get the lines. 
		for(var j = 0, jn = cols; j < jn; j++)
		{
			var column = ops.columns[j],
			value = item[ops.columns[j].name] || '',
			colLines = [],
			actualWidth = column.actualWidth;
			
			//width not present? skip the column
			if(!actualWidth) continue;
			
			
			if(value.length > actualWidth)
			{
				if(ops.ellipsis)
				{
					var newBuffer = value.substr(0, actualWidth-3) + cli.utils.repeat('.', Math.min(actualWidth, 3));
					
					addLines(colLines, newBuffer, column);
				}
				else
				{
					var start = 0;
					
					//splice apart the single line, treating each chunk as a new line
					for(var k = actualWidth; k < value.length + actualWidth; k += actualWidth)
                    {
						addLines(colLines, value.substr(start, actualWidth), column);
						start  = k;
                    }
				}
			}
			else
			{
				addLines(colLines, value, column);
			}
			
			//if this column lines 
			numLines = Math.max(numLines, colLines.length);
			
			
			//next add the line - need to check against all lines now
			lineTable.push(colLines);
			
			
			//need to go through all the column lines again, and 
			//make sure all the lines match up properly
			for(var k = 0, kn = lineTable.length; k < kn; k++)
			{
				var line = lineTable[k];
				
				//must have same number of lineTable
				if(line.length < numLines)
				{
					addLines(lineTable[k], cli.utils.repeat('\n', numLines - line.length -1), ops.columns[k]);
				}
			}
		}
		
		var rows = [];
		//inversed
		for(var i = 0, n = lineTable.length; i < n; i++)
		{
			var col = lineTable[i];
			
			//each row
			for(var j = 0, jn = col.length;  j < jn; j++)
			{
				if(!rows[j]) rows[j] = [];
				
				rows[j].push(col[j]);
			}
		}
		
		return rows;
	}
	
	function logRow(ops, buffer)
	{
		console.log(cli.utils.repeat(' ', ops.pad.left) + buffer);
	}
	
	function drawBreak(ops)
	{
		if(ops.horz) logRow(ops, cli.utils.repeat(ops.horz, ops.width));
	}
	
	function drawRow(lineTable, ops)
	{
		for(var i = 0, n = lineTable.length; i < n; i++)
		{
			logRow(ops, lineTable[i].join(ops.vert))
		}	
		
		drawBreak(ops);
	}
	
	function drawTable(source, ops)
	{
		if(ops.pad.top) console.log(cli.utils.repeat('\n', ops.pad.top-1));
		
		drawBreak(ops);
		
		for(var i = source.length; i--;)
		{
			var lineTable = getRowLineTable(source[i], ops)
			
			drawRow(lineTable, ops);
		}
		
		if(ops.pad.bottom) console.log(cli.utils.repeat('\n', ops.pad.bottom-1));
		
	}
	
	
	cli.drawTable = function(source, ops)
	{
		ops = normalizeOptions(ops);
		drawTable(source, ops);
		
		// console.log(ops)
		
	}
}