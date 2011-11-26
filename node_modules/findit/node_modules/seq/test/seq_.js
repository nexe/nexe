var Seq = require('seq');
var assert = require('assert');

exports.seq_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    Seq(['xxx'])
        .seq_('pow', function (next, x) {
            assert.eql(next, this);
            assert.eql(x, 'xxx');
            next(null, 'yyy');
        })
        .seq(function (y) {
            clearTimeout(to);
            assert.eql(y, 'yyy');
            assert.eql(this.vars.pow, 'yyy');
        })
    ;
};

exports.par_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    Seq()
        .par_(function (next) {
            assert.eql(next, this);
            next(null, 111);
        })
        .par_(function (next) {
            assert.eql(next, this);
            next(null, 222);
        })
        .seq(function (x, y) {
            clearTimeout(to);
            assert.eql(x, 111);
            assert.eql(y, 222);
        })
    ;
};

exports.forEach_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    var acc = [];
    Seq([7,8,9])
        .forEach_(function (next, x) {
            assert.eql(next, this);
            acc.push(x);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(acc, [ 7, 8, 9 ]);
        })
    ;
};

exports.seqEach_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    var acc = [];
    Seq([7,8,9])
        .seqEach_(function (next, x) {
            assert.eql(next, this);
            acc.push(x);
            setTimeout(function () {
                next(null, x);
            }, Math.random() * 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(acc, [ 7, 8, 9 ]);
            assert.eql(this.stack, [ 7, 8, 9 ]);
        })
    ;
};

exports.parEach_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    var acc = [];
    Seq([7,8,9])
        .parEach_(function (next, x) {
            assert.eql(next, this);
            acc.push(x);
            setTimeout(function () {
                next(null, x);
            }, Math.random() * 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(acc, [ 7, 8, 9 ]);
            assert.eql(this.stack, [ 7, 8, 9 ]);
        })
    ;
};

exports.seqMap_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    var acc = [];
    Seq([7,8,9])
        .seqMap_(function (next, x) {
            assert.eql(next, this);
            acc.push(x);
            setTimeout(function () {
                next(null, x * 10);
            }, Math.random() * 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(acc, [ 7, 8, 9 ]);
            assert.eql(this.stack, [ 70, 80, 90 ]);
        })
    ;
};

exports.parMap_ = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 5000);
    
    var acc = [];
    Seq([7,8,9])
        .parMap_(function (next, x) {
            assert.eql(next, this);
            acc.push(x);
            setTimeout(function () {
                next(null, x * 10);
            }, Math.random() * 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(acc, [ 7, 8, 9 ]);
            assert.eql(this.stack, [ 70, 80, 90 ]);
        })
    ;
};
