var EventEmitter = require('events').EventEmitter;
var Hash = require('hashish');
var Chainsaw = require('chainsaw');

module.exports = Seq;
function Seq (xs) {
    if (xs && !Array.isArray(xs) || arguments.length > 1) {
        throw new Error('Optional argument to Seq() is exactly one Array');
    }
    
    var ch = Chainsaw(function (saw) {
        builder.call(this, saw, xs || []);
    });
    
    process.nextTick(function () {
        ch['catch'](function (err) {
            console.error(err.stack ? err.stack : err)
        });
    });
    return ch;
}

Seq.ap = Seq; // for compatability with versions <0.3

function builder (saw, xs) {
    var context = {
        vars : {},
        args : {},
        stack : xs,
        error : null
    };
    context.stack_ = context.stack;
    
    function action (step, key, f, g) {
        var cb = function (err) {
            var args = [].slice.call(arguments, 1);
            if (err) {
                context.error = { message : err, key : key };
                saw.jump(lastPar);
                saw.down('catch');
                g();
            }
            else {
                if (typeof key == 'number') {
                    context.stack_[key] = args[0];
                    context.args[key] = args;
                }
                else {
                    context.stack_.push.apply(context.stack_, args);
                    if (key !== undefined) {
                        context.vars[key] = args[0];
                        context.args[key] = args;
                    }
                }
                if (g) g(args, key);
            }
        };
        Hash(context).forEach(function (v,k) { cb[k] = v });
        
        cb.into = function (k) {
            key = k;
            return cb;
        };
        
        cb.next = function (err, xs) {
            context.stack_.push.apply(context.stack_, xs);
            cb.apply(cb, [err].concat(context.stack));
        };
        
        cb.pass = function (err) {
            cb.apply(cb, [err].concat(context.stack));
        };
        
        cb.ok = cb.bind(cb, null);
        
        f.apply(cb, context.stack);
    }
    
    var running = 0;
    var errors = 0;
    
    this.seq = function (key, cb) {
        var bound = [].slice.call(arguments, 2);
        
        if (typeof key === 'function') {
            if (arguments.length > 1) bound.unshift(cb);
            cb = key;
            key = undefined;
        }
        
        if (context.error) saw.next()
        else if (running === 0) {
            action(saw.step, key,
                function () {
                    context.stack_ = [];
                    var args = [].slice.call(arguments);
                    args.unshift.apply(args, bound.map(function (arg) {
                        return arg === Seq ? this : arg
                    }, this));
                    
                    cb.apply(this, args);
                }, function () {
                    context.stack = context.stack_;
                    saw.next()
                }
            );
        }
    };
    
    var lastPar = null;
    this.par = function (key, cb) {
        lastPar = saw.step;
        
        if (running == 0) {
            // empty the active stack for the first par() in a chain
            context.stack_ = [];
        }
        
        var bound = [].slice.call(arguments, 2);
        if (typeof key === 'function') {
            if (arguments.length > 1) bound.unshift(cb);
            cb = key;
            key = context.stack_.length;
            context.stack_.push(null);
        }
        var cb_ = function () {
            var args = [].slice.call(arguments);
            args.unshift.apply(args, bound.map(function (arg) {
                return arg === Seq ? this : arg
            }, this));
            
            cb.apply(this, args);
        };
        
        running ++;
        
        var step = saw.step;
        process.nextTick(function () {
            action(step, key, cb_, function (args) {
                if (!args) errors ++;
                
                running --;
                if (running == 0) {
                    context.stack = context.stack_.slice();
                    saw.step = lastPar;
                    if (errors > 0) saw.down('catch');
                    errors = 0;
                    saw.next();
                }
            });
        });
        saw.next();
    };
    
    [ 'seq', 'par' ].forEach(function (name) {
        this[name + '_'] = function (key) {
            var args = [].slice.call(arguments);
            
            var cb = typeof key === 'function'
                ? args[0] : args[1];
            
            var fn = function () {
                var argv = [].slice.call(arguments);
                argv.unshift(this);
                cb.apply(this, argv);
            };
            
            if (typeof key === 'function') {
                args[0] = fn;
            }
            else {
                args[1] = fn;
            }
            
            this[name].apply(this, args);
        };
    }, this);
    
    this['catch'] = function (cb) {
        if (context.error) {
            cb.call(context, context.error.message, context.error.key);
            context.error = null;
        }
        saw.next();
    };
    
    this.forEach = function (cb) {
        this.seq(function () {
            context.stack_ = context.stack.slice();
            var end = context.stack.length;
            
            if (end === 0) this(null)
            else context.stack.forEach(function (x, i) {
                action(saw.step, i, function () {
                    cb.call(this, x, i);
                    if (i == end - 1) saw.next();
                });
            });
        });
    };
    
    this.seqEach = function (cb) {
        this.seq(function () {
            context.stack_ = context.stack.slice();
            var xs = context.stack.slice();
            if (xs.length === 0) this(null);
            else (function next (i) {
                action(
                    saw.step, i,
                    function () { cb.call(this, xs[i], i) },
                    function (args) {
                        if (!args || i === xs.length - 1) saw.next();
                        else next(i + 1);
                    }
                );
            }).bind(this)(0);
        });
    };
    
    this.parEach = function (limit, cb) {
        var xs = context.stack.slice();
        if (cb === undefined) { cb = limit; limit = xs.length }
        context.stack_ = [];
        
        var active = 0;
        var finished = 0;
        var queue = [];
        
        if (xs.length === 0) saw.next()
        else xs.forEach(function call (x, i) {
            if (active >= limit) {
                queue.push(call.bind(this, x, i));
            }
            else {
                active ++;
                action(saw.step, i,
                    function () {
                        cb.call(this, x, i);
                    },
                    function () {
                        active --;
                        finished ++;
                        if (queue.length > 0) queue.shift()();
                        else if (finished === xs.length) {
                            saw.next();
                        }
                    }
                );
            }
        });
    };
    
    this.parMap = function (limit, cb) {
        var res = [];
        var len = context.stack.length;
        if (cb === undefined) { cb = limit; limit = len }
        var res = [];
        
        Seq()
            .extend(context.stack)
            .parEach(limit, function (x, i) {
                var self = this;
                
                var next = function () {
                    res[i] = arguments[1];
                    self.apply(self, arguments);
                };
                
                next.stack = self.stack;
                next.stack_ = self.stack_;
                next.vars = self.vars;
                next.args = self.args;
                next.error = self.error;
                
                next.into = function (key) {
                    return function () {
                        res[key] = arguments[1];
                        self.apply(self, arguments);
                    };
                };
                
                next.ok = function () {
                    var args = [].slice.call(arguments);
                    args.unshift(null);
                    return next.apply(next, args);
                };
                
                cb.apply(next, arguments);
            })
            .seq(function () {
                context.stack = res;
                saw.next();
            })
        ;
    };
    
    this.seqMap = function (cb) {
        var res = [];
        var lastIdx = context.stack.length - 1;
        
        this.seqEach(function (x, i) {
            var self = this;
            
            var next = function () {
                res[i] = arguments[1];
                if (i === lastIdx)
                    context.stack = res;
                self.apply(self, arguments);
            };
            
            next.stack = self.stack;
            next.stack_ = self.stack_;
            next.vars = self.vars;
            next.args = self.args;
            next.error = self.error;
            
            next.into = function (key) {
                return function () {
                    res[key] = arguments[1];
                    if (i === lastIdx)
                        context.stack = res;
                    self.apply(self, arguments);
                };
            };
            
            next.ok = function () {
                var args = [].slice.call(arguments);
                args.unshift(null);
                return next.apply(next, args);
            };
            
            cb.apply(next, arguments);
        });
    };
    
    /**
     * Consumes any errors that occur in `cb`. Calls to `this.into(i)` will place
     * that value, if accepted by the filter, at the index in the results as
     * if it were the i-th index before filtering. (This means it will never 
     * override another value, and will only actually appear at i if the filter
     * accepts all values before i.)
     */
    this.parFilter = function (limit, cb) {
        var res = [];
        var len = context.stack.length;
        if (cb === undefined) { cb = limit; limit = len }
        var res = [];
        
        Seq()
            .extend(context.stack)
            .parEach(limit, function (x, i) {
                var self = this;
                
                var next = function (err, ok) {
                    if (!err && ok)
                        res.push([i, x]);
                    arguments[0] = null; // discard errors
                    self.apply(self, arguments);
                };
                
                next.stack = self.stack;
                next.stack_ = self.stack_;
                next.vars = self.vars;
                next.args = self.args;
                next.error = self.error;
                
                next.into = function (key) {
                    return function (err, ok) {
                        if (!err && ok)
                            res.push([key, x]);
                        arguments[0] = null; // discard errors
                        self.apply(self, arguments);
                    };
                };
                
                next.ok = function () {
                    var args = [].slice.call(arguments);
                    args.unshift(null);
                    return next.apply(next, args);
                };
                
                cb.apply(next, arguments);
            })
            .seq(function () {
                context.stack = res.sort().map(function(pair){ return pair[1]; });
                saw.next();
            })
        ;
    };
    
    /**
     * Consumes any errors that occur in `cb`. Calls to `this.into(i)` will place
     * that value, if accepted by the filter, at the index in the results as
     * if it were the i-th index before filtering. (This means it will never 
     * override another value, and will only actually appear at i if the filter
     * accepts all values before i.)
     */
    this.seqFilter = function (cb) {
        var res = [];
        var lastIdx = context.stack.length - 1;
        
        this.seqEach(function (x, i) {
            var self = this;
            
            var next = function (err, ok) {
                if (!err && ok)
                    res.push([i, x]);
                if (i === lastIdx)
                    context.stack = res.sort().map(function(pair){ return pair[1]; });
                arguments[0] = null; // discard errors
                self.apply(self, arguments);
            };
            
            next.stack = self.stack;
            next.stack_ = self.stack_;
            next.vars = self.vars;
            next.args = self.args;
            next.error = self.error;
            
            next.into = function (key) {
                return function (err, ok) {
                    if (!err && ok)
                        res.push([key, x]);
                    if (i === lastIdx)
                        context.stack = res.sort().map(function(pair){ return pair[1]; });
                    arguments[0] = null; // discard errors
                    self.apply(self, arguments);
                };
            };
            
            next.ok = function () {
                var args = [].slice.call(arguments);
                args.unshift(null);
                return next.apply(next, args);
            };
            
            cb.apply(next, arguments);
        });
    };
    
    [ 'forEach', 'seqEach', 'parEach', 'seqMap', 'parMap', 'seqFilter', 'parFilter' ]
        .forEach(function (name) {
            this[name + '_'] = function (cb) {
                this[name].call(this, function () {
                    var args = [].slice.call(arguments);
                    args.unshift(this);
                    cb.apply(this, args);
                });
            };
        }, this)
    ;
    
    ['push','pop','shift','unshift','splice','reverse']
        .forEach(function (name) {
            this[name] = function () {
                context.stack[name].apply(
                    context.stack,
                    [].slice.call(arguments)
                );
                saw.next();
                return this;
            };
        }, this)
    ;
    
    [ 'map', 'filter', 'reduce' ]
        .forEach(function (name) {
            this[name] = function () {
                var res = context.stack[name].apply(
                    context.stack,
                    [].slice.call(arguments)
                );
                // stack must be an array, or bad things happen
                context.stack = (Array.isArray(res) ? res : [res]);
                saw.next();
                return this;
            };
        }, this)
    ;
    
    this.extend = function (xs) {
        if (!Array.isArray(xs)) {
            throw new Error('argument to .extend() is not an Array');
        }
        context.stack.push.apply(context.stack, xs);
        saw.next();
    };
    
    this.flatten = function (pancake) {
        var xs = [];
        // should we fully flatten this array? (default: true)
        if (pancake === undefined) { pancake = true; }
        context.stack.forEach(function f (x) {
            if (Array.isArray(x) && pancake) x.forEach(f);
            else if (Array.isArray(x)) xs = xs.concat(x);
            else xs.push(x);
        });
        context.stack = xs;
        saw.next();
    };
    
    this.unflatten = function () {
        context.stack = [context.stack];
        saw.next();
    };
    
    this.empty = function () {
        context.stack = [];
        saw.next();
    };
    
    this.set = function (stack) {
        context.stack = stack;
        saw.next();
    };
    
    this['do'] = function (cb) {
        saw.nest(cb, context);
    };
}
