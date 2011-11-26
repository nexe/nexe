var celery = require('../lib');

var objects = [ { name: 'bean.cupboard.scaffold',
    hasUpdates: '',
    published: 'published: 2 hours agofdsfsafsfadffdsf afsd fasf as fsd fsdf sdf sdf sd  ' },
  { name: 'teamdigest',
    hasUpdates: '',
    published: 'published: 2 hours ago' }];

console.log(celery.columns())

celery.drawTable(objects, {
    	columns: [{
			width: 15, 
			minWidth:20,
			name: 'name'
		},
		{
			name: 'published',
			width:15,
			align:'right'
		}],
    
    horz: ' ',
	vert: '|'
    
});

celery.open();