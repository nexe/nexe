var Seq = require('seq');
var assert = require('assert');

exports.seq = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 100);
    
    Seq([0])
        .seq('pow', function (n) {
            this(null, 1);
        })
        .seq(function (n) {
            assert.eql(n, 1);
            assert.eql(n, this.vars.pow);
            var seq = this;
            setTimeout(function () { seq(null, 2) }, 25);
            assert.eql(this.stack, [n]);
        })
        .seq(function (n) {
            assert.eql(n, 2);
            assert.eql(this.stack, [n]);
            this(null, 5, 6, 7);
        })
        .seq(function (x, y, z) {
            clearTimeout(to);
            assert.eql([x,y,z], [5,6,7]);
        })
    ;
};

exports.into = function () {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 10);
    var calls = 0;
    
    Seq([3,4,5])
        .seq(function () {
            this.into('w')(null, 5);
        })
        .seq(function (w) {
            clearTimeout(to);
            assert.eql(w, this.vars.w);
            assert.eql(arguments.length, 1);
            assert.eql(w, 5);
        })
    ;
};

exports.catchSeq = function () {
    var to = setTimeout(function () {
        assert.fail('never caught the error');
    }, 100);
    
    var tf = setTimeout(function () {
        assert.fail('final action never executed');
    }, 100);
    
    var calls = {};
    Seq([1])
        .seq(function (n) {
            assert.eql(n, 1);
            calls.before = true;
            this('pow!');
            calls.after = true;
        })
        .seq(function (n) {
            calls.next = true;
            assert.fail('should have skipped this');
        })
        .catch(function (err) {
            assert.eql(err, 'pow!');
            assert.ok(calls.before);
            assert.ok(!calls.after);
            assert.ok(!calls.next);
            clearTimeout(to);
        })
        .do(function () {
            //assert.ok(calls.after);
            clearTimeout(tf);
        })
    ;
};

exports.par = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 1000);
    
    Seq()
        .seq(function () {
            this(null, 'mew');
        })
        .par(function () {
            var seq = this;
            setTimeout(function () { seq(null, 'x') }, 50);
        })
        .par(function () {
            var seq = this;
            setTimeout(function () { seq(null, 'y') }, 25);
        })
        .par('z', function () {
            this(null, 42);
        })
        .seq(function (x, y, z) {
            clearTimeout(to);
            assert.eql(x, 'x');
            assert.eql(y, 'y');
            assert.eql(z, 42);
            assert.eql(this.args, { 0 : ['x'], 1 : ['y'], z : [42] });
            assert.eql(this.stack, [ 'x', 'y', 42 ]);
            assert.eql(this.vars, { z : 42 });
        })
    ;
};

exports.catchPar = function () {
    var done = false, caught = false;
    var tc = setTimeout(function () {
        assert.fail('error not caught');
    }, 1000);
    
    Seq()
        .par('one', function () {
            setTimeout(this.bind({}, 'rawr'), 25);
        })
        .par('two', function () {
            setTimeout(this.bind({}, null, 'y'), 50);
        })
        .seq(function (x, y) {
            assert.fail('seq fired with error above');
        })
        .catch(function (err, key) {
            clearTimeout(tc);
            assert.eql(err, 'rawr');
            assert.eql(key, 'one');
        })
    ;
};

exports.catchParWithoutSeq = function () {
    var done = false, caught = false;
    var tc = setTimeout(function () {
        assert.fail('error not caught');
    }, 5000);
    
    Seq()
        .par('one', function () {
            setTimeout(this.bind({}, 'rawr'), 25);
        })
        .par('two', function () {
            setTimeout(this.bind({}, null, 'y'), 50);
        })
        .catch(function (err, key) {
            clearTimeout(tc);
            assert.eql(err, 'rawr');
            assert.eql(key, 'one');
        })
    ;    
}

exports.catchParMultipleErrors = function() {
    var caught={};
    var to = setTimeout(function() {
        assert.fail('Never finished');
    }, 1000);
    var times = 0;
    
    Seq()
        .par('one', function() {
            setTimeout(this.bind({}, 'rawr1'), 25);
        })
        .par('two', function() {
            setTimeout(this.bind({}, 'rawr2'), 50);
        })
        .catch(function(err,key) {
            caught[key] = err;
        })
        .seq(function() {
            clearTimeout(to);
            times ++;
            assert.eql(times, 1);
            assert.eql(caught, { one:'rawr1', two:'rawr2' });
        })
    ;
};

exports.catchParThenSeq = function () {
    var tc = setTimeout(function () {
        assert.fail('error not caught');
    }, 1000);
    var tf = setTimeout(function () {
        assert.fail('final seq not run');
    }, 500);
    var times = 0;
    var errs = [
        { key : 'one', msg : 'rawr' },
        { key : 'four', msg : 'pow' },
    ];
    
    Seq()
        .par('one', function () {
            setTimeout(this.bind({}, 'rawr'), 25);
        })
        .par('two', function () {
            setTimeout(this.bind({}, null, 'y'), 50);
        })
        .par('three', function () {
            setTimeout(this.bind({}, null, 'z'), 30);
        })
        .par('four', function () {
            setTimeout(this.bind({}, 'pow'), 45);
        })
        .seq(function (x, y) {
            assert.fail('seq fired with error above');
        })
        .catch(function (err, key) {
            clearTimeout(tc);
            var e = errs.shift();
            assert.eql(err, e.msg);
            assert.eql(key, e.key);
        })
        .seq(function () {
            clearTimeout(tf);
            times ++;
            assert.eql(times, 1);
        })
    ;    
}

exports.forEach = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired after forEach');
    }, 25);
    
    var count = 0;
    Seq([1,2,3])
        .push(4)
        .forEach(function (x, i) {
            assert.eql(x - 1, i);
            count ++;
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(count, 4);
        })
    ;
};

exports.seqEach = function () {
    var to = setTimeout(function () {
        assert.fail('seqEach never finished');
    }, 25);
    
    var count = 0;
    var ii = 0;
    Seq([1,2,3])
        .seqEach(function (x, i) {
            assert.eql(i, ii++);
            assert.eql(x, [1,2,3][i]);
            count ++;
            this(null);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(count, 3);
        })
    ;
};

exports.seqEachCatch = function () {
    var to = setTimeout(function () {
        assert.fail('never caught the error');
    }, 25);
    var tf = setTimeout(function () {
        assert.fail('never resumed afterwards');
    }, 25);
    
    var meows = [];
    
    var values = [];
    Seq([1,2,3,4])
        .seqEach(function (x, i) {
            values.push([i,x]);
            assert.eql(x - 1, i);
            if (i >= 2) this('meow ' + i)
            else this(null, x * 10);
        })
        .seq(function (xs) {
            assert.fail('should fail before this action');
        })
        .catch(function (err) {
            clearTimeout(to);
            meows.push(err);
            assert.eql(err, 'meow 2');
            assert.eql(values, [[0,1],[1,2],[2,3]]);
        })
        .seq(function () {
            clearTimeout(tf);
        })
    ;
};

exports.parEach = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    var values = [];
    Seq([1,2,3,4])
        .parEach(function (x, i) {
            values.push([i,x]);
            setTimeout(this.bind({}, null), 20);
        })
        .seq(function () {
            assert.deepEqual(this.stack, [1,2,3,4])
            assert.deepEqual(values, [[0,1],[1,2],[2,3],[3,4]]);
            clearTimeout(to);
        })
    ;
};

exports.parEachVars = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 1000);
    var values = [];
    
    Seq()
        .seq('abc', function () {
            this(null, 'a', 'b', 'c');
        })
        .parEach(function (x) {
            values.push(x);
            setTimeout(this.bind(this, null), Math.floor(Math.random() * 50));
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(values, ['a','b','c']);
            assert.eql(this.stack, ['a','b','c']);
            assert.eql(this.vars.abc, 'a');
        })
    ;
};

exports.parEachInto = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    Seq([1,2,3,4])
        .parEach(function (x, i) {
            setTimeout((function () {
                this.into('abcd'.charAt(i))(null, x);
            }).bind(this), 20);
        })
        .seq(function () {
            clearTimeout(to);
            assert.deepEqual(this.stack, [1,2,3,4])
            assert.deepEqual(this.vars, { a : 1, b : 2, c : 3, d : 4 });
        })
    ;
};

exports.parEachCatch = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    var values = [];
    Seq([1,2,3,4])
        .parEach(function (x, i) {
            values.push([i,x]);
            setTimeout(this.bind({}, 'zing'), 10);
        })
        .seq(function () {
            assert.fail('should have errored before this point')
        })
        .catch(function (err) {
            clearTimeout(to);
            assert.eql(err, 'zing');
            assert.deepEqual(values, [[0,1],[1,2],[2,3],[3,4]]);
        })
    ;
};

exports.parEachLimited = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .parEach(3, function (x, i) {
            running ++;
            
            assert.ok(running <= 3);
            
            values.push([i,x]);
            setTimeout((function () {
                running --;
                this(null);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(values,
                [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10]]
            );
        })
    ;
};

exports.parMap = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .parMap(2, function (x, i) {
            running ++;
            
            assert.ok(running <= 2);
            
            setTimeout((function () {
                running --;
                this(null, x * 10);
            }).bind(this), Math.floor(Math.random() * 100));
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [10,20,30,40,50,60,70,80,90,100]);
            assert.eql(this.stack, [].slice.call(arguments));
        })
    ;
};

exports.parMapFast = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .parMap(function (x, i) {
            this(null, x * 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [10,20,30,40,50,60,70,80,90,100]);
            assert.eql(this.stack, [].slice.call(arguments));
        })
    ;
};

exports.parMapInto = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .parMap(function (x, i) {
            this.into(9 - i)(null, x * 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
            assert.eql(this.stack, [].slice.call(arguments));
        })
    ;
};

exports.seqMap = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .seqMap(function (x, i) {
            running ++;
            
            assert.eql(running, 1);
            
            setTimeout((function () {
                running --;
                this(null, x * 10);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [10,20,30,40,50,60,70,80,90,100]);
        })
    ;
};


exports.seqMapInto = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .seqMap(function (x, i) {
            running ++;
            
            assert.eql(running, 1);
            
            setTimeout((function () {
                running --;
                this.into(9 - i)(null, x * 10);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
        })
    ;
};

exports.parFilter = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .parFilter(2, function (x, i) {
            running ++;
            
            assert.ok(running <= 2);
            
            setTimeout((function () {
                running --;
                this(null, x % 2 === 0);
            }).bind(this), Math.floor(Math.random() * 100));
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [2,4,6,8,10]);
            assert.eql(this.stack, [].slice.call(arguments));
        })
    ;
};

exports.seqFilter = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .seqFilter(function (x, i) {
            running ++;
            
            assert.eql(running, 1);
            
            setTimeout((function () {
                running --;
                this(null, x % 2 === 0);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [2,4,6,8,10]);
        })
    ;
};

exports.parFilterInto = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .parFilter(2, function (x, i) {
            running ++;
            
            assert.ok(running <= 2);
            
            setTimeout((function () {
                running --;
                this.into(x % 3)(null, x % 2 === 0);
            }).bind(this), Math.floor(Math.random() * 100));
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [ 6, 10, 4, 2, 8 ]);
            assert.eql(this.stack, [].slice.call(arguments));
        })
    ;
};

exports.seqFilterInto = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq([1,2,3,4,5,6,7,8,9,10])
        .seqFilter(function (x, i) {
            running ++;
            
            assert.eql(running, 1);
            
            setTimeout((function () {
                running --;
                this.into(x % 3)(null, x % 2 === 0);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [ 6, 10, 4, 2, 8 ]);
        })
    ;
};

exports.stack = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    Seq([4,5,6])
        .seq(function (x, y, z) {
            assert.eql(arguments.length, 3);
            assert.eql([x,y,z], [4,5,6]);
            assert.eql(this.stack, [4,5,6]);
            this(null);
        })
        .set([3,4])
        .seq(function (x, y) {
            assert.eql(arguments.length, 2);
            assert.eql([x,y], [3,4]);
            assert.eql(this.stack, [3,4]);
            this(null);
        })
        .empty()
        .seq(function () {
            assert.eql(arguments.length, 0);
            assert.eql(this.stack, []);
            this.next(null, ['a']);
        })
        .extend(['b','c'])
        .seq(function (a, b, c) {
            assert.eql(arguments.length, 3);
            assert.eql([a,b,c], ['a','b','c']);
            assert.eql(this.stack, ['a','b','c']);
            this.pass(null);
        })
        .pop()
        .push('c', 'd', 'e')
        .seq(function (a, b, c, d, e) {
            assert.eql(arguments.length, 5);
            assert.eql([a,b,c,d,e], ['a','b','c','d','e']);
            assert.eql(this.stack, ['a','b','c','d','e']);
            this.pass(null);
        })
        .shift()
        .shift()
        .seq(function (c, d, e) {
            assert.eql(arguments.length, 3);
            assert.eql([c,d,e], ['c','d','e']);
            assert.eql(this.stack, ['c','d','e']);
            this.pass(null);
        })
        .set([['a',['b']],['c','d',['e']]])
        .flatten(false) // only flatten one level
        .seq(function (a, b, c, d, e) {
            assert.eql(arguments.length, 5);
            assert.eql([a,b,c,d,e], ['a',['b'],'c','d',['e']]);
            assert.eql(this.stack,  ['a',['b'],'c','d',['e']]);
            this.pass(null);
        })
        .set([['a','b'],['c','d',['e']]])
        .flatten()
        .seq(function (a, b, c, d, e) {
            assert.eql(arguments.length, 5);
            assert.eql([a,b,c,d,e], ['a','b','c','d','e']);
            assert.eql(this.stack, ['a','b','c','d','e']);
            this.pass(null);
        })
        .splice(2, 2)
        .seq(function (a, b, e) {
            assert.eql(arguments.length, 3);
            assert.eql([a,b,e], ['a','b','e']);
            assert.eql(this.stack, ['a','b','e']);
            this.pass(null);
        })
        .reverse()
        .seq(function (a, b, e){
            assert.eql(arguments.length, 3);
            assert.eql([a,b,e], ['e','b','a']);
            assert.eql(this.stack, ['e','b','a']);
            this.pass(null);
        })
        .map(function(ch){ return ch.toUpperCase(); })
        .seq(function (A, B, E){
            assert.eql(arguments.length, 3);
            assert.eql([A,B,E], ['E','B','A']);
            assert.eql(this.stack, ['E','B','A']);
            this.pass(null);
        })
        .reduce(function(s, ch){ return s + ':' + ch; })
        .seq(function (acc){
            assert.eql(arguments.length, 1);
            assert.eql(acc, 'E:B:A');
            assert.eql(this.stack, ['E:B:A']);
            this.pass(null);
        })
        .seq(function () {
            clearTimeout(to);
            this(null);
        })
    ;
};

exports.ap = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    var cmp = [1,2,3];
    Seq.ap([1,2,3])
        .seqEach(function (x) {
            assert.eql(cmp.shift(), x);
            this(null);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(cmp, []);
        })
    ;
    
    assert.throws(function () {
        Seq.ap({ a : 1, b : 2 });
    });
};

exports.seqBind = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    Seq([4,5])
        .seq(function (a, b, c, d) {
            assert.eql(a, 2);
            assert.eql(b, 3);
            assert.eql(c, 4);
            assert.eql(d, 5);
            this(null);
        }, 2, 3)
        .seq(function () {
            clearTimeout(to);
        })
    ;
};

exports.parBind = function () {
    var t1 = setTimeout(function () {
        assert.fail('1 never finished');
    }, 500);
    var t2 = setTimeout(function () {
        assert.fail('2 never finished');
    }, 500);
    var t3 = setTimeout(function () {
        assert.fail('3 never finished');
    }, 500);
    
    Seq(['c'])
        .par(function (a, b, c) {
            clearTimeout(t1);
            assert.eql(a, 'a');
            assert.eql(b, 'b');
            assert.eql(c, 'c');
            this(null);
        }, 'a', 'b')
        .par(function (x, c) {
            clearTimeout(t2);
            assert.eql(x, 'x');
            assert.eql(c, 'c');
            this(null);
        }, 'x')
        .seq(function () {
            clearTimeout(t3);
        })
    ;
};

exports.emptySeqEach = function () {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 100);
    
    Seq()
        .seqEach(function (x) {
            assert.fail('no elements');
        })
        .seq(function () {
            clearTimeout(to);
        })
    ;
};

exports.emptyForEach = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 500);
    
    Seq()
        .forEach(function () {
            assert.fail('non-empty stack');
        })
        .seq(function () {
            clearTimeout(to);
        })
    ;
};

exports.emptyParEach = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 500);
    
    Seq()
        .parEach(function () {
            assert.fail('non-empty stack');
        })
        .seq(function () {
            clearTimeout(to);
        })
    ;
};

exports.emptyParMap = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 500);
    
    Seq()
        .parMap(function () {
            assert.fail('non-empty stack');
        })
        .seq(function () {
            clearTimeout(to);
        })
    ;
};

exports.emptySeqMap = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 500);
    
    Seq()
        .seqMap(function () {
            assert.fail('non-empty stack');
        })
        .seq(function () {
            clearTimeout(to);
        })
    ;
};

exports.ok = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 500);
    
    function moo1 (cb) { cb(3) }
    function moo2 (cb) { cb(4) }
    
    Seq()
        .par(function () { moo1(this.ok) })
        .par(function () { moo2(this.ok) })
        .seq(function (x, y) {
            clearTimeout(to);
            assert.eql(x, 3);
            assert.eql(y, 4);
        })
    ;
};

exports.nextOk = function () {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 500);
    
    function moo1 (cb) { cb(3) }
    function moo2 (cb) { cb(4) }
    
    Seq()
        .par_(function (next) { moo1(next.ok) })
        .par_(function (next) { moo2(next.ok) })
        .seq_(function (next, x, y) {
            assert.eql(x, 3);
            assert.eql(y, 4);
            next.ok([ 1, 2, 3 ])
        })
        .flatten()
        .parMap_(function (next, x) {
            next.ok(x * 100)
        })
        .seq_(function (next) {
            clearTimeout(to);
            assert.deepEqual(next.stack, [ 100, 200, 300 ]);
        })
    ;
};

exports.regressionTestForAccidentalDeepTraversalOfTheContext = function () {
    // Create a single-item stack with a bunch of references to other objects:
    var stack = [{}];
    for (var i = 0 ; i < 10000 ; i += 1) {
        stack[0][i] = stack[0];
    }

    var startTime = new Date(),
        numCalled = 0,
        to = setTimeout(function () {
            assert.fail('never got to the end of the chain');
        }, 1000);

    Seq(stack)
        .parEach(function (item) {
            numCalled += 1;
            this();
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(numCalled, 1);
            assert.ok((new Date().getTime() - startTime) < 1000, 'if this test takes longer than a second, the bug must have been reintroduced');
        });
};
