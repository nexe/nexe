fs = require 'fs'
exec = require('child_process').exec
Seq = require 'seq'

Seq()
    .seq_((next) -> exec 'whoami', next)
    .par_((next, who) -> exec('groups ' + who, next))
    .par_((next, who) -> fs.readFile(__filename, 'utf8', next))
    .seq_((next, groups, src) ->
        console.log('Groups: ' + groups.trim())
        console.log('This file has ' + src.length + ' bytes')
    )
