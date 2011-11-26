//oh my god what have I written. Quick, look away!!!

exports.plugin = function(cli)
{
    
    //draw table params & columns
    //cli.drawTable(..., {name: 20, age: 20}
    //TODO

    function addLines(ops)
    {
        var columnWidth = ops.columnWidth,
        lines = ops.lines,
        buffer = ops.buffer,
        currentWidth = ops.currentWidth,
        align = ops.align,
        ellipsis = ops.ellipsis,
        windowWidth = ops.windowWidth,
        columnIndex = ops.columnIndex,
        columns = ops.columns,
        vert;
        

        //last element? fill in the rest
        if(columnIndex == columns.length-1)
        {
            columnWidth = windowWidth - currentWidth;
            vert = '';
        }
        else
        {
            vert = ops.vert;
        }

        
        var maxWidth = columnWidth - vert.length;
        
                    
        buffer.split('\n').forEach(function(line, index)
        {
            
            if(line.length > maxWidth)
            {
            
                //text too long? option to still keep it a one-liner
                if(ellipsis)
                {
                    line = line.substr(0, maxWidth-3) + '...';
                }
                else
                {
                    var start = 0;
                    var newLines = [];
					
                    
                    for(var i = maxWidth; i < line.length + maxWidth; i += maxWidth)
                    {
                        newLines.push(line.substr(start, maxWidth));
                        start = i;
                    }
					
                    
                    return addLines({
                        buffer: newLines.join('\n'),
                        columnWidth: columnWidth,
                        currentWidth: currentWidth,
                        align: ops.align,
                        windowWidth: windowWidth,
                        vert: vert,
                        lines: lines,
                        columnIndex: columnIndex,
                        columns: columns
                    });
                }
            }
			
            padding = Math.max(columnWidth - line.length, 0);
            
            var colStr = '';
            
           
            
            switch(align)
            {
                case 'right':
                    colStr = cli.utils.padLeft(line, padding, ' ');
                    break;
                
                case 'center':
                    colStr = cli.utils.pad(str, Math.floor(padding/2), ' ', Math.ceil(padding/2));
                    break;
                    
                default: 
                    colStr = cli.utils.padRight(line, padding, ' ');
                    break;
                    
            }

			
			                      
            if(!lines[index] )
            {
                var buffer = '';
                

                for(var i = 0, n = columnIndex; i < n; i++)
                {
                    buffer += cli.utils.padLeft(vert, columns[i].width-vert.length, ' ');
                }
                
                lines[index] = buffer;
            }
else
{
	console.log('GGG'+colStr);
	console.log(index)
}


            

			//console.log(maxWidth + " " + currentWidth+" "+lines[index].length);
            
            
            
            lines[index] += colStr + vert;
        });
    }
    
    cli.drawTable2 = cli.table = function(objects, ops)
    {
        if(!(objects instanceof Array)) objects = [objects];
        
        var windowWidth = ops.width || cli.columns(),
        columns = ops.columns,
        colArray = [],
        vert = ops.vertical   || ops.vert || '  ',
        horz = ops.horizontal || ops.horz || '',
        ellipsis = ops.ellipsis;
        
        
        if(ops.padRight) windowWidth -= ops.padRight;
        
        
        if(ops.border)
        {
            if(vert == '  ') vert = ' | ';
            if(horz == '') horz = '–'; 
        }

        
        
        var tableWidth = 0,
        title = {},
        medianColWidth;
        
        //convert the object into an array
        if(columns instanceof Array)
        {
            colArray = columns;
            
            var numColumns = colArray.length, medianColWidth = Math.round(numColumns/windowWidth)
            
            for(var i = numColumns; i--;)
            {
                var col = colArray[i];
                
                if(typeof col == 'string')
                {
                    colArray[i] = col = {
                        name: col,
                        width: medianColWidth
                    };
                }
                
                title[col.name] = col.name;
                tableWidth += col.width;
            }
        }
        else
        {
            for(var property in columns)
            {
                var param = columns[property];
                
                if(typeof param == 'number')
                {
                    param = {
                        width: param,
                    };
                }
                
                param.name = property;
                tableWidth += param.width || 0;
                
                title[param.name] = param.name;
                colArray.push(param);
            }
        }
        
        //objects.unshift(title);
        
        
        objects.forEach(function(object)
        {
        
            var lines = [];
        
            var buffer = '', currentWidth = 0;
            
            for(var i = 0, n = colArray.length; i < n; i++)
            {
                var columnInfo = colArray[i];
                
                if(typeof columnInfo == 'string')
                {
                    columnInfo = {
                        name: columnInfo
                    };
                }
                
                if(!columnInfo.width) columnInfo.width = Math.round(100/n) + '%';
                
                columnName = columnInfo.name;
                
				//percent
                if(true || typeof columnInfo.width == 'string')
				{
					
					//var cw = columnInfo.width.substr(0, columnInfo.width.length-1);
					
                	columnWidth = Math.min(columnInfo.width, Math.floor((columnInfo.width/tableWidth) * windowWidth));
					
				}
				else
				{
					columnWidth = columnInfo.width;
				}	
 
				
                //the string element. could be from a method, prop, or it's undefined
                var str = (columnInfo.get ? columnInfo.get(object) : object[columnName] || 'Undefined').toString();
                
                
                
                addLines({
                    buffer: str,
                    lines: lines,
                    columnWidth: columnWidth,
                    currentWidth: currentWidth,
                    align: columnInfo.align,
                    windowWidth: windowWidth,
                    vert: vert,
                    ellipsis: ellipsis,
                    columnIndex: i,
                    columns: colArray
                });
                
                                
                currentWidth += columnWidth + vert.length;

            }
            
            if(horz.length) console.log(cli.utils.repeat(horz, windowWidth));
            
            lines.forEach(function(line)
            {
                console.log(line);
            });
        });
        
        
        if(horz) console.log(cli.utils.repeat(horz,windowWidth));
    }
}