var fs = require('fs');
var exec = require('child_process').exec;

var Seq = require('seq');
Seq()
    .seq(function () {
        exec('whoami', this)
    })
    .par(function (who) {
        exec('groups ' + who, this);
    })
    .par(function (who) {
        fs.readFile(__filename, 'utf8', this);
    })
    .seq(function (groups, src) {
        console.log('Groups: ' + groups.trim());
        console.log('This file has ' + src.length + ' bytes');
    })
;
