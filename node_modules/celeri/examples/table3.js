var celery = require('../lib');

var objects = [ { command: 'init',
    desc: 'Adds a project in cwd to cupboard.' },
  { command: 'remove <proj>',
    desc: 'Removes project from cupboard.' },
  { command: '<cmd> <proj>',
    desc: 'Calls custom command specified in project cupboard config.' },
  { command: 'untouch <proj>',
    desc: 'Flags given project as updated.' },
  { command: 'publish <proj>',
    desc: 'Publishes target project.' },
  { command: 'updates',
    desc: 'List all projects with updates.' },
  { command: 'list',
    desc: 'List all projects in cupboard organized by most recently updated.' },
  { command: 'install <cupboard plugin>',
    desc: 'Installs a third-party cupboard plugin.' },
  { command: 'uninstall <cupboard plugin>',
    desc: 'Uninstalls a third-party cupboard plugin.' },
  { command: 'plugins',
    desc: 'Lists all third-party plugins.' },
  { command: 'scaffold <type>',
    desc: 'Initializes target scaffold in cwd' },
  { command: 'github <proj>',
    desc: 'Open github page of target project' },
  { command: 'github-issues <proj>',
    desc: 'Open github issues of target project.' },
  { command: 'help', desc: 'Shows the help menu.' },
  { command: 'dir <proj>',
    desc: 'Returns the project path.' },
  { command: 'details <proj>',
    desc: 'Returns details about the given project such as modified files, and number of updates.' } ];


celery.drawTable(objects, {
    	columns: [ {
			minWidth: 25,
			width: 20,
			name: 'command'
		},
		{
			name: 'desc',
			width: 80,
			align: 'left'
		} ],
		
		pad: {
			left: 10,
			right: 10,
			top: 2,
			bottom: 2
		},
    
ellipsis: true
    
});

celery.open();