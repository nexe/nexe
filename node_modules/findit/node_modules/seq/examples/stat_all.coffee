fs = require 'fs'
Hash = require 'hashish'
Seq = require 'seq'

Seq()
    .seq_((next) ->
        fs.readdir(__dirname, next)
    )
    .flatten()
    .parEach_((next, file) ->
        fs.stat(__dirname + '/' + file, next.into(file))
    )
    .seq_((next) ->
        sizes = Hash.map(next.vars, (s) -> s.size)
        console.dir sizes
    )
