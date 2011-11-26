var celeri = require('../lib');

celeri.drawTree({
	'home/':{
		'network/':{
			'apps/' :[
				"cliqly",
				"clove",
				"team digest"
			],
			'public/': {
				'git/':{
					'some-project':[
						'index.js'
					]
				},
				'npm/':{
					'some-project':['index.js']
				}
			}
		}
	},
	'downloads/': {
		'libcpp': [
			'makefile'
		]
	}
})         


//celeri.drawTree(celeri);


celeri.open();