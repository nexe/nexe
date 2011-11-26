exports.plugin = function(mediator)
{
	
	function meta1(pull)
	{
		pull.end('metadata 1');
	}

	function meta2(pull)
	{
		pull.end('metadata 2');
	}

	function meta3(pull)
	{
		pull.end('metadata 3');
	}

	function filterMeta(pull)
	{
		mediator.pull('meta', null, { meta: { group: pull.data.group } }, function(data)
		{
			pull.end(data || '');
		});
	}
	
	mediator.on({
		'pull -public -rotate -group=1 meta': meta1,
		'pull -public -rotate -group=2 meta': meta2,
		'pull -public -rotate -group=3 meta': meta3,
		'pull -public meta/:group': filterMeta
	});
	
}