var Seq = require('seq');
Seq()
    .par(function () {
        var that = this;
        setTimeout(function () { that(null, 'a') }, 300);
    })
    .par(function () {
        var that = this;
        setTimeout(function () { that(null, 'b') }, 200);
    })
    .par(function () {
        var that = this;
        setTimeout(function () { that(null, 'c') }, 100);
    })
    .seq(function (a, b, c) {
        console.dir([ a, b, c ])
    })
;
