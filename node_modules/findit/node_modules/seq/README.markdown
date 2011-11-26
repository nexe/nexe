Seq
===

Seq is an asynchronous flow control library with a chainable interface for
sequential and parallel actions. Even the error handling is chainable.

Each action in the chain operates on a stack of values.
There is also a variables hash for storing values by name.

[TOC]



Examples
========

stat_all.js
-----------

````javascript
var fs = require('fs');
var Hash = require('hashish');
var Seq = require('seq');

Seq()
    .seq(function () {
        fs.readdir(__dirname, this);
    })
    .flatten()
    .parEach(function (file) {
        fs.stat(__dirname + '/' + file, this.into(file));
    })
    .seq(function () {
        var sizes = Hash.map(this.vars, function (s) { return s.size })
        console.dir(sizes);
    })
;
````

Output:

    { 'stat_all.js': 404, 'parseq.js': 464 }

parseq.js
---------

````javascript
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
        fs.readFile(__filename, 'ascii', this);
    })
    .seq(function (groups, src) {
        console.log('Groups: ' + groups.trim());
        console.log('This file has ' + src.length + ' bytes');
    })
;
````

Output:

    Groups: substack : substack dialout cdrom floppy audio src video plugdev games netdev fuse www
    This file has 464 bytes




API
===

Each method executes callbacks with a context (its `this`) described in the next
section. Every method returns `this`.

Whenever `this()` is called with a non-falsy first argument, the error value
propagates down to the first `catch` it sees, skipping over all actions in
between. There is an implicit `catch` at the end of all chains that prints the
error stack if available and otherwise just prints the error.



Seq(xs=[])
----------

The constructor function creates a new `Seq` chain with the methods described
below. The optional array argument becomes the new context stack.

Array argument is new in 0.3. `Seq()` now behaves like `Seq.ap()`.


.seq(cb)
--------
.seq(key, cb, *args)
--------------------

This eponymous function executes actions sequentially.
Once all running parallel actions are finished executing,
the supplied callback is `apply()`'d with the context stack.

To execute the next action in the chain, call `this()`. The first
argument must be the error value. The rest of the values will become the stack
for the next action in the chain and are also available at `this.args`.

If `key` is specified, the second argument sent to `this` goes to
`this.vars[key]` in addition to the stack and `this.args`.
`this.vars` persists across all requests unless it is overwritten.

All arguments after `cb` will be bound to `cb`, which is useful because
`.bind()` makes you set `this`. If you pass in `Seq` in the arguments list,
it'll get transformed into `this` so that you can do:

````javascript
Seq()
    .seq(fs.readdir, __dirname, Seq)
    .seq(function (files) { console.dir(files) })
;
````

which prints an array of files in `__dirname`.


.par(cb)
--------
.par(key, cb, *args)
--------------------

Use `par` to execute actions in parallel.
Chain multiple parallel actions together and collect all the responses on the
stack with a sequential operation like `seq`.

Each `par` sets one element in the stack with the second argument to `this()` in
the order in which it appears, so multiple `par`s can be chained together.

Like with `seq`, the first argument to `this()` should be the error value and
the second will get pushed to the stack. Further arguments are available in
`this.args`.

If `key` is specified, the result from the second argument send to `this()` goes
to `this.vars[key]`.
`this.vars` persists across all requests unless it is overwritten.

All arguments after `cb` will be bound to `cb`, which is useful because
`.bind()` makes you set `this`. Like `.seq()`, you can pass along `Seq` in these
bound arguments and it will get tranformed into `this`.


.catch(cb)
----------

Catch errors. Whenever a function calls `this` with a non-falsy first argument,
the message propagates down the chain to the first `catch` it sees.
The callback `cb` fires with the error object as its first argument and the key
that the action that caused the error was populating, which may be undefined.

`catch` is a sequential action and further actions may appear after a `catch` in
a chain. If the execution reaches a `catch` in a chain and no error has occured,
the `catch` is skipped over.

For convenience, there is a default error handler at the end of all chains.
This default error handler looks like this:

````javascript
.catch(function (err) {
    console.error(err.stack ? err.stack : err)
})
````


.forEach(cb)
------------

Execute each action in the stack under the context of the chain object.
`forEach` does not wait for any of the actions to finish and does not itself
alter the stack, but the callback may alter the stack itself by modifying
`this.stack`.

The callback is executed `cb(x,i)` where `x` is the element and `i` is the
index. 

`forEach` is a sequential operation like `seq` and won't run until all pending
parallel requests yield results.


.seqEach(cb)
------------

Like `forEach`, call `cb` for each element on the stack, but unlike `forEach`,
`seqEach` waits for the callback to yield with `this` before moving on to the
next element in the stack.

The callback is executed `cb(x,i)` where `x` is the element and `i` is the
index. 

If `this()` is supplied non-falsy error, the error propagates downward but any
other arguments are ignored. `seqEach` does not modify the stack itself.


.parEach(cb)
------------
.parEach(limit, cb)
-------------------

Like `forEach`, calls cb for each element in the stack and doesn't wait for the
callback to yield a result with `this()` before moving on to the next iteration.
Unlike `forEach`, `parEach` waits for all actions to call `this()` before moving
along to the next action in the chain.

The callback is executed `cb(x,i)` where `x` is the element and `i` is the
index. 

`parEach` does not modify the stack itself and errors supplied to `this()`
propagate.

Optionally, if limit is supplied to `parEach`, at most `limit` callbacks will be
active at a time.


.seqMap(cb)
-----------

Like `seqEach`, but collect the values supplied to `this` and set the stack to
these values.


.parMap(cb)
-----------
.parMap(limit, cb)
------------------

Like `parEach`, but collect the values supplied to `this` and set the stack to
these values.


.seqFilter(cb)
-----------

Executes the callback `cb(x, idx)` against each element on the stack, waiting for the
callback to yield with `this` before moving on to the next element. If the callback 
returns an error or a falsey value, the element will not be included in the resulting
stack.

Any errors from the callback are consumed and **do not** propagate.

Calls to `this.into(i)` will place the value, if accepted by the callback, at the index in
the results as if it were ordered at i-th index on the stack before filtering (with ties
broken by the values). This implies `this.into` will never override another stack value
even if their indices collide. Finally, the value will only actually appear at `i` if the
callback accepts or moves enough values before `i`.


.parFilter(cb)
-----------
.parFilter(limit, cb)
------------------

Executes the callback `cb(x, idx)` against each element on the stack, but **does not**
wait for it to yield before moving on to the next element. If the callback returns an
error or a falsey value, the element will not be included in the resulting stack.

Any errors from the callback are consumed and **do not** propagate.

Calls to `this.into(i)` will place the value, if accepted by the callback, at the index in
the results as if it were ordered at i-th index on the stack before filtering (with ties
broken by the values). This implies `this.into` will never override another stack value
even if their indices collide. Finally, the value will only actually appear at `i` if the
callback accepts or moves enough values before `i`.

Optionally, if limit is supplied to `parEach`, at most `limit` callbacks will be
active at a time.


.do(cb)
-------
Create a new nested context. `cb`'s first argument is the previous context, and `this`
is the nested `Seq` object.


.flatten(fully=true)
--------------------

Recursively flatten all the arrays in the stack. Set `fully=false` to flatten
only one level.


.unflatten()
------------

Turn the contents of the stack into a single array item. You can think of it
as the inverse of `flatten(false)`.


.extend([x,y...])
-----------------

Like `push`, but takes an array. This is like python's `[].extend()`.


.set(xs)
--------

Set the stack to a new array. This assigns the reference, it does not copy.


.empty()
--------

Set the stack to [].


.push(x,y...), .pop(), .shift(), .unshift(x), .splice(...), reverse()
---------------------------------------------------------------------
.map(...), .filter(...), .reduce(...)
-------------------------------------

Executes an array operation on the stack.

The methods `map`, `filter`, and `reduce` are also proxies to their Array counterparts:
they have identical signatures to the Array methods, operate synchronously on the context
stack, and do not pass a Context object (unlike `seqMap` and `parMap`).

The result of the transformation is assigned to the context stack; in the case of `reduce`,
if you do not return an array, the value will be wrapped in one.

````javascript
Seq([1, 2, 3])
    .reduce(function(sum, x){ return sum + x; }, 0)
    .seq(function(sum){
        console.log('sum: %s', sum);
        // sum: 6
        console.log('stack is Array?', Array.isArray(this.stack));
        // stack is Array: true
        console.log('stack:', this.stack);
        // stack: [6]
    })
;
````




Explicit Parameters
-------------------

For environments like coffee-script or nested logic where threading `this` is
bothersome, you can use:

* seq_
* par_
* forEach_
* seqEach_
* parEach_
* seqMap_
* parMap_

which work exactly like their un-underscored counterparts except for the first
parameter to the supplied callback is set to the context, `this`.



Context Object
==============

Each callback gets executed with its `this` set to a function in order to yield
results, error values, and control. The function also has these useful fields:

this.stack
----------

The execution stack.

this.stack_
-----------

The previous stack value, mostly used internally for hackish purposes.

this.vars
---------

A hash of key/values populated with `par(key, ...)`, `seq(key, ...)` and
`this.into(key)`.

this.into(key)
--------------

Instead of sending values to the stack, sets a key and returns `this`.
Use `this.into(key)` interchangeably with `this` for yielding keyed results.
`into` overrides the optional key set by `par(key, ...)` and `seq(key, ...)`.

this.ok
-------

Set the `err` to null. Equivalent to `this.bind(this, null)`.

this.args
---------

`this.args` is like `this.stack`, but it contains all the arguments to `this()`
past the error value, not just the first. `this.args` is an array with the same
indices as `this.stack` but also stores keyed values for the last sequential
operation. Each element in `this.array` is set to `[].slice.call(arguments, 1)`
from inside `this()`.

this.error
----------

This is used for error propagation. You probably shouldn't mess with it.



Installation
============

With [npm](http://github.com/isaacs/npm), just do:

    npm install seq

or clone this project on github:

    git clone http://github.com/substack/node-seq.git

To run the tests with [expresso](http://github.com/visionmedia/expresso),
just do:

    expresso



Dependencies
------------

This module uses [chainsaw](http://github.com/substack/node-chainsaw)
When you `npm install seq` this dependency will automatically be installed.


