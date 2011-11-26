var sardModule0 = {}; 
var Structr = function(fhClass, parent) {
    if (!parent) parent = Structr.fh({});
    var that = Structr.extend(parent, fhClass);
    if (!that.__construct) {
        that.__construct = function() {};
    }
    that.__construct.prototype = that;
    that.__construct.extend = function(child) {
        return Structr(child, that);
    };
    return that.__construct;
};

Structr.copy = function(from, to, lite) {
    if (typeof to == "boolean") {
        lite = to;
        to = undefined;
    }
    if (!to) to = from instanceof Array ? [] : {};
    var i;
    for (i in from) {
        var fromValue = from[i], toValue = to[i], newValue;
        if (!lite && typeof fromValue == "object" && (!fromValue || fromValue.__proto__ == Object.prototype || fromValue.__proto__ == Array.prototype)) {
            if (toValue && fromValue instanceof toValue.constructor) {
                newValue = toValue;
            } else {
                newValue = fromValue instanceof Array ? [] : {};
            }
            Structr.copy(fromValue, newValue);
        } else {
            newValue = fromValue;
        }
        to[i] = newValue;
    }
    return to;
};

Structr.getMethod = function(that, property) {
    return function() {
        return that[property].apply(that, arguments);
    };
};

Structr.wrap = function(that) {
    if (that._wrapped) return that;
    that._wrapped = true;
    function wrap(target) {
        return function() {
            return target.apply(that, arguments);
        };
    }
    for (var property in that) {
        var target = that[property];
        if (typeof target == "function") {
            that[property] = wrap(target);
        }
    }
    return that;
};

Structr.findProperties = function(target, modifier) {
    var props = [], property;
    for (property in target) {
        var v = target[property];
        if (v && v[modifier]) {
            props.push(property);
        }
    }
    return props;
};

Structr.nArgs = function(func) {
    var inf = func.toString().replace(/\{[\W\S]+\}/g, "").match(/\w+(?=[,\)])/g);
    return inf ? inf.length : 0;
};

Structr.getFuncsByNArgs = function(that, property) {
    return that.__private["overload::" + property] || (that.__private["overload::" + property] = {});
};

Structr.getOverloadedMethod = function(that, property, nArgs) {
    var funcsByNArgs = Structr.getFuncsByNArgs(that, property);
    return funcsByNArgs[nArgs];
};

Structr.setOverloadedMethod = function(that, property, func, nArgs) {
    var funcsByNArgs = Structr.getFuncsByNArgs(that, property);
    if (func.overloaded) return funcsByNArgs;
    funcsByNArgs[nArgs || Structr.nArgs(func)] = func;
    return funcsByNArgs;
};

Structr.modifiers = {
    m_override: function(that, property, newMethod) {
        var oldMethod = that.__private && that.__private[property] || that[property] || function() {}, parentMethod = oldMethod;
        if (oldMethod.overloaded) {
            var overloadedMethod = oldMethod, nArgs = Structr.nArgs(newMethod);
            parentMethod = Structr.getOverloadedMethod(that, property, nArgs);
        }
        var wrappedMethod = function() {
            this._super = parentMethod;
            var ret = newMethod.apply(this, arguments);
            delete this._super;
            return ret;
        };
        if (oldMethod.overloaded) {
            return Structr.modifiers.m_overload(that, property, wrappedMethod, nArgs);
        }
        return wrappedMethod;
    },
    m_explicit: function(that, property, gs) {
        var pprop = "__" + property;
        if (typeof gs != "object") {
            gs = {};
        }
        if (!gs.get) gs.get = function() {
            return this._value;
        };
        if (!gs.set) gs.set = function(value) {
            this._value = value;
        };
        return function(value) {
            if (!arguments.length) {
                this._value = this[pprop];
                var ret = gs.get.apply(this);
                delete this._value;
                return ret;
            } else {
                if (this[pprop] == value) return;
                this._value = this[pprop];
                gs.set.apply(this, [ value ]);
                this[pprop] = this._value;
            }
        };
    },
    m_implicit: function(that, property, egs) {
        that.__private[property] = egs;
        that.__defineGetter__(property, egs);
        that.__defineSetter__(property, egs);
    },
    m_overload: function(that, property, value, nArgs) {
        var funcsByNArgs = Structr.setOverloadedMethod(that, property, value, nArgs);
        var multiFunc = function() {
            var func = funcsByNArgs[arguments.length];
            if (func) {
                return funcsByNArgs[arguments.length].apply(this, arguments);
            } else {
                var expected = [];
                for (var sizes in funcsByNArgs) {
                    expected.push(sizes);
                }
                throw new Error("Expected " + expected.join(",") + " parameters, got " + arguments.length + ".");
            }
        };
        multiFunc.overloaded = true;
        return multiFunc;
    }
};

Structr.extend = function(from, to) {
    if (!to) to = {};
    var that = {
        __private: {
            propertyModifiers: {}
        }
    };
    if (to instanceof Function) to = to();
    Structr.copy(from, that);
    var usedProperties = {}, property;
    for (property in to) {
        var value = to[property];
        var propModifiersAr = property.split(" "), propertyName = propModifiersAr.pop(), modifierList = that.__private.propertyModifiers[propertyName] || (that.__private.propertyModifiers[propertyName] = []);
        if (propModifiersAr.length) {
            var propModifiers = {};
            for (var i = propModifiersAr.length; i--; ) {
                var modifier = propModifiersAr[i];
                propModifiers["m_" + propModifiersAr[i]] = 1;
                if (modifierList.indexOf(modifier) == -1) {
                    modifierList.push(modifier);
                }
            }
            if (propModifiers.m_explicit || propModifiers.m_implicit) {
                value = Structr.modifiers.m_explicit(that, propertyName, value);
            }
            if (propModifiers.m_override) {
                value = Structr.modifiers.m_override(that, propertyName, value);
            }
            if (propModifiers.m_implicit) {
                Structr.modifiers.m_implicit(that, propertyName, value);
                continue;
            }
        }
        for (var j = modifierList.length; j--; ) {
            value[modifierList[j]] = true;
        }
        if (usedProperties[propertyName]) {
            var oldValue = that[propertyName];
            if (!oldValue.overloaded) Structr.modifiers.m_overload(that, propertyName, oldValue, undefined);
            value = Structr.modifiers.m_overload(that, propertyName, value, undefined);
        }
        usedProperties[propertyName] = 1;
        that.__private[propertyName] = that[propertyName] = value;
    }
    if (that.__construct && from.__construct && that.__construct == from.__construct) {
        that.__construct = Structr.modifiers.m_override(that, "__construct", function() {
            this._super.apply(this, arguments);
        });
    }
    var propertyName;
    for (propertyName in that) {
        var value = that[propertyName];
        if (value && value["static"]) {
            that.__construct[propertyName] = value;
            delete that[propertyName];
        }
    }
    return that;
};

Structr.fh = function(that) {
    that = Structr.extend({}, that);
    that.getMethod = function(property) {
        return Structr.getMethod(this, property);
    };
    that.extend = function(target) {
        return Structr.extend(this, target);
    };
    that.copyTo = function(target, lite) {
        Structr.copy(this, target, lite);
    };
    that.wrap = function() {
        return Structr.wrap(this);
    };
    return that;
};

sardModule0 = Structr;
var sardModule6 = {}; 
var sardVar5 = sardModule0;

var Token = {
    WORD: 1,
    METADATA: 1 << 1,
    NUMBER: 1 << 2,
    PARAM: 1 << 3,
    TO: 1 << 4,
    BACKSLASH: 1 << 5,
    DOT: 1 << 6,
    STAR: 1 << 7,
    OR: 1 << 8,
    LP: 1 << 9,
    RP: 1 << 10,
    EQ: 1 << 11,
    WHITESPACE: 1 << 12
};

var Reversed = {
    or: Token.OR
};

var Tokenizer = function() {
    var source = "", pos = 0, currentToken, self = this;
    this.source = function(value) {
        if (value) {
            source = value + " ";
            pos = 0;
        }
        return source;
    };
    this.next = function(keepWhite) {
        return currentToken = nextToken(keepWhite);
    };
    this.peekChars = function(n) {
        return source.substr(pos, n);
    };
    this.current = function(keepWhite) {
        return currentToken || self.next(keepWhite);
    };
    this.position = function() {
        return pos;
    };
    var nextToken = function(keepWhite) {
        if (!keepWhite) skipWhite();
        if (eof()) return null;
        var c = currentChar(), ccode = c.charCodeAt(0);
        if (isWhite(ccode)) {
            skipWhite();
            return token(" ", Token.WHITESPACE);
        }
        if (isAlpha(ccode)) {
            var w = nextWord();
            return token(w, Reversed[w.toLowerCase()] || Token.WORD);
        }
        if (isNumber(ccode)) {
            return token(nextNumber(), Token.NUMBER);
        }
        switch (c) {
          case "-":
            if (nextChar() == ">") return token("->", Token.TO, true);
            if (isAlpha(currentCharCode())) return token(nextWord(), Token.METADATA);
            error();
          case ":":
            if (isAlpha(nextCharCode())) return token(nextWord(), Token.PARAM);
            error();
          case "/":
            return token("/", Token.BACKSLASH, true);
          case ".":
            return token(".", Token.DOT, true);
          case "*":
            return token("*", Token.STAR, true);
          case "(":
            return token("(", Token.LP, true);
          case ")":
            return token(")", Token.RP, true);
          case "=":
            return token("=", Token.EQ, true);
          default:
            error();
        }
        return null;
    };
    var error = function() {
        throw new Error('Unexpected character "' + currentChar() + '" at position ' + pos + ' in "' + source + '"');
    };
    var token = function(value, type, skipOne) {
        if (skipOne) nextChar();
        return {
            value: value,
            type: type
        };
    };
    var nextChar = this.nextChar = function() {
        return source[++pos];
    };
    var currentChar = this.currentChar = function() {
        return source[pos];
    };
    var isAlpha = this.isAlpha = function(c) {
        return c > 96 && c < 123 || c > 64 && c < 91 || isNumber(c);
    };
    var isWhite = this.isWhite = function(c) {
        return c == 32 || c == 9 || c == 10;
    };
    var isNumber = this.isNumber = function(c) {
        return c > 47 && c < 58;
    };
    var nextCharCode = function() {
        return nextChar().charCodeAt(0);
    };
    var currentCharCode = function() {
        return currentChar().charCodeAt(0);
    };
    var rewind = function(steps) {
        pos -= steps || 1;
    };
    var skipWhite = function() {
        var end = false;
        while (!(end = eof())) {
            if (!isWhite(currentCharCode())) break;
            nextChar();
        }
        return !end;
    };
    var nextNumber = function() {
        var buffer = currentChar();
        while (!eof()) {
            if (isNumber(nextCharCode())) {
                buffer += currentChar();
            } else {
                break;
            }
        }
        return buffer;
    };
    var nextWord = function() {
        var buffer = currentChar();
        while (!eof()) {
            if (!isWhite(nextCharCode()) && !currentChar().match(/[\/=()]/g)) {
                buffer += currentChar();
            } else {
                break;
            }
        }
        return buffer;
    };
    var eof = function() {
        return pos > source.length - 2;
    };
};

var ChannelParser = function() {
    var tokenizer = new Tokenizer, cache = {};
    this.parse = function(source) {
        if (!source) throw new Error("Source is not defined");
        if (cache[source]) return sardVar5.copy(cache[source]);
        tokenizer.source(source);
        return sardVar5.copy(cache[source] = rootExpr());
    };
    var rootExpr = function() {
        var expr = tokenizer.current(), type, meta = {};
        if (expr.type == Token.WORD && tokenizer.isWhite(tokenizer.peekChars(1).charCodeAt(0)) && tokenizer.position() < tokenizer.source().length - 1) {
            type = expr.value;
            tokenizer.next();
        }
        var token, channels = [];
        while (token = tokenizer.current()) {
            switch (token.type) {
              case Token.METADATA:
                meta[token.value] = metadataValue();
                break;
              case Token.BACKSLASH:
              case Token.WORD:
              case Token.STAR:
                channels = channels.concat(channelsExpr());
                break;
              case Token.OR:
                tokenizer.next();
                break;
              default:
                tokenizer.next();
                break;
            }
        }
        return {
            type: type,
            meta: meta,
            channels: channels
        };
    };
    var metadataValue = function() {
        if (tokenizer.currentChar() == "=") {
            tokenizer.next();
            var v = tokenizer.next().value;
            tokenizer.next();
            return v;
        }
        tokenizer.next();
        return 1;
    };
    var channelsExpr = function() {
        var channels = [], to;
        while (hasNext()) {
            if (currentTypeIs(Token.LP)) {
                tokenizer.next();
            }
            if (currentTypeIs(Token.WORD | Token.PARAM | Token.STAR | Token.BACKSLASH)) {
                channels.push([ channelPathsExpr() ]);
                while (currentTypeIs(Token.OR)) {
                    tokenizer.next();
                    channels[channels.length - 1].push(channelPathsExpr());
                }
            } else {
                break;
            }
            if (currentTypeIs(Token.RP)) {
                tokenizer.next();
            }
            if (currentTypeIs(Token.TO)) {
                tokenizer.next();
            }
        }
        var _orChannels = splitChannelExpr(channels.concat(), []), channelsThru = [];
        for (var i = _orChannels.length; i--; ) {
            var chain = sardVar5.copy(_orChannels[i]), current = channel = chain[chain.length - 1];
            for (var j = chain.length - 1; j--; ) {
                current = current.thru = chain[j];
            }
            channelsThru.push(channel);
        }
        return channelsThru;
    };
    var splitChannelExpr = function(orChannels, stack) {
        if (!orChannels.length) return [ stack ];
        var current = orChannels.shift();
        if (current.length == 1) {
            stack.push(current[0]);
            return splitChannelExpr(orChannels, stack);
        } else {
            var split = [];
            for (var i = current.length; i--; ) {
                var stack2 = stack.concat();
                stack2.push(current[i]);
                split = split.concat(splitChannelExpr(orChannels.concat(), stack2));
            }
            return split;
        }
    };
    var channelPathsExpr = function(type) {
        var paths = [], token, isMiddleware = false, cont = true;
        while (cont && (token = tokenizer.current())) {
            switch (token.type) {
              case Token.WORD:
              case Token.PARAM:
              case Token.NUMBER:
                paths.push({
                    name: token.value,
                    param: token.type == Token.PARAM
                });
                break;
              case Token.BACKSLASH:
                break;
              default:
                cont = false;
                break;
            }
            if (cont) tokenizer.next();
        }
        if (currentTypeIs(Token.STAR)) {
            isMiddleware = true;
            tokenizer.next();
        }
        return {
            paths: paths,
            isMiddleware: isMiddleware
        };
    };
    var currentToken = function(type, igError) {
        return checkToken(tokenizer.current(), type, igError);
    };
    var nextToken = function(type, igError, keepWhite) {
        return checkToken(tokenizer.next(keepWhite), type, igError);
    };
    var checkToken = function(token, type, igError) {
        if (!token || !(type & token.type)) {
            if (!igError) throw new Error('Unexpected token "' + (token || {}).value + '" at position ' + tokenizer.position() + " in " + tokenizer.source());
            return null;
        }
        return token;
    };
    var currentTypeIs = function(type) {
        var current = tokenizer.current();
        return current && !!(type & current.type);
    };
    var hasNext = function() {
        return !!tokenizer.current();
    };
};

sardModule6.parse = (new ChannelParser).parse;
var sardModule8 = {}; 
sardModule8.replaceParams = function(expr, params) {
    var path;
    for (var i = expr.channel.paths.length; i--; ) {
        path = expr.channel.paths[i];
        if (path.param) {
            path.param = false;
            path.name = params[path.name];
            if (!path.name) expr.channel.paths.splice(i, 1);
        }
    }
    return expr;
};

sardModule8.channel = function(expr, index) {
    return {
        type: expr.type,
        channel: expr.channels[index],
        meta: expr.meta || {}
    };
};

sardModule8.pathToString = function(path) {
    var paths = [];
    for (var i = 0, n = path.length; i < n; i++) {
        var pt = path[i];
        paths.push(pt.param ? ":" + pt.name : pt.name);
    }
    return paths.join("/");
};

sardModule8.passThrusToArray = function(channel) {
    var cpt = channel.thru, thru = [];
    while (cpt) {
        thru.push(this._pathToString(cpt.paths));
        cpt = cpt.thru;
    }
    return thru;
};
var sardModule11 = {}; 
sardModule11.rotator = function(target, meta) {
    if (!target) target = {};
    target.meta = [ meta ];
    target.allowMultiple = true;
    target.getRoute = function(ops) {
        var route = ops.route, listeners = ops.listeners;
        if (!ops.router._allowMultiple && route && route.meta && route.meta[meta] != undefined && listeners.length) {
            route.meta[meta] = ++route.meta[meta] % listeners.length;
            ops.listeners = [ listeners[route.meta[meta]] ];
        }
    };
    target.setRoute = function(ops) {};
};

sardModule11.rotator(sardModule11, "rotate");
var sardModule13 = {}; 
var sardVar10 = sardModule0;

sardModule13 = function() {
    var mw = new sardModule13.Middleware;
    mw.add(sardModule11);
    return mw;
};

sardModule13.Middleware = sardVar10({
    __construct: function() {
        this._toMetadata = {};
        this._universal = {};
    },
    add: function(module) {
        var self = this;
        if (module.all) {
            module.all.forEach(function(type) {
                if (!self._universal[type]) self._universal[type] = [];
                self._universal[type].push(module);
            });
        }
        module.meta.forEach(function(name) {
            self._toMetadata[name] = module;
        });
    },
    getRoute: function(ops) {
        var mw = this._getMW(ops.route ? ops.route.meta : {}, "getRoute").concat(this._getMW(ops.expr.meta));
        return this._eachMW(ops, mw, function(cur, ops) {
            return cur.getRoute(ops);
        });
    },
    setRoute: function(ops) {
        var mw = this._getMW(ops.meta, "setRoute");
        return this._eachMW(ops, mw, function(cur, ops) {
            return cur.setRoute(ops);
        });
    },
    allowMultiple: function(expr) {
        var mw = this._getMW(expr.meta);
        for (var i = mw.length; i--; ) {
            if (mw[i].allowMultiple) return true;
        }
        return false;
    },
    _getMW: function(meta, uni) {
        var mw = (this._universal[uni] || []).concat();
        for (var name in meta) {
            if (!meta[name]) continue;
            var handler = this._toMetadata[name];
            if (handler && mw.indexOf(handler) == -1) mw.push(handler);
        }
        return mw;
    },
    _eachMW: function(ops, mw, each) {
        var cops = ops, newOps;
        for (var i = mw.length; i--; ) {
            if (newOps = each(mw[i], cops)) {
                cops = newOps;
            }
        }
        return cops;
    }
});
var sardModule17 = {}; 
var sardVar15 = sardModule0, sardVar16 = sardModule6;

var Request = sardVar15({
    __construct: function(listener, batch) {
        this.data = batch.data;
        this.inner = batch.inner;
        this.callback = batch.callback;
        this._used = {};
        this._queue = [];
        this._add(listener, this.data, batch.paths);
        if (batch._next) {
            this.add(batch._next);
        }
    },
    init: function() {
        return this;
    },
    hasNext: function() {
        return !!this._queue.length;
    },
    next: function() {
        if (this._queue.length) {
            var thru = this._queue.pop(), target = thru.target;
            this.current = target;
            if (target.paths) {
                var route = this.origin.getRoute({
                    channel: target
                });
                this._addListeners(route.listeners, route.data, target.paths);
                return this.next();
            }
            if (this._used[target.id]) return this.next();
            this._used[target.id] = thru;
            this._prepare(target, thru.data, thru.paths);
            return true;
        }
        return false;
    },
    _addListeners: function(listeners, data, paths) {
        if (listeners instanceof Array) {
            for (var i = listeners.length; i--; ) {
                this._add(listeners[i], data, paths);
            }
            return;
        }
    },
    add: function(callback) {
        this._queue.unshift(this._func(callback));
    },
    unshift: function(callback) {
        this._queue.push(this._func(callback));
    },
    _func: function(callback) {
        return {
            target: {
                callback: callback
            },
            data: {}
        };
    },
    _add: function(route, data, paths) {
        var current = route, _queue = this._queue;
        if (!data) data = {};
        while (current) {
            for (var i = paths.length; i--; ) {
                var opath = paths[i], cpath = route.path[i], param, value;
                if (cpath.param && !opath.param) {
                    param = cpath.name;
                    value = opath.name;
                } else if (cpath.param && opath.param) {
                    param = cpath.name;
                    value = this.data[opath.name];
                }
                this.data[param] = data[param] = value;
            }
            _queue.push({
                target: current,
                data: data || {},
                paths: paths
            });
            current = current.thru;
        }
    },
    _prepare: function(target, data, paths) {
        if (target.meta.one) {
            target.dispose();
        }
        this._callback(target, data);
    },
    _callback: function(target, data) {
        return target.callback.call(this, this);
    }
});

sardModule17 = Request;
var sardModule23 = {}; 
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] == obj) {
                return i;
            }
        }
        return -1;
    };
}

if (this.window && !window.console) {
    var console = {
        log: function() {}
    };
}

var sk = {};
var sardModule26 = {}; 
sardModule23;

sardModule26 = sardModule0;
var sardModule28 = {}; 
var sardVar27 = sardModule26;

sardModule28.Janitor = sardVar27({
    __construct: function() {
        this.dispose();
    },
    addDisposable: function() {
        var args = arguments[0] instanceof Array ? arguments[0] : arguments;
        for (var i = args.length; i--; ) {
            var target = args[i];
            if (target && target["dispose"]) {
                if (this.disposables.indexOf(target) == -1) this.disposables.push(target);
            }
        }
    },
    dispose: function() {
        if (this.disposables) for (var i = this.disposables.length; i--; ) {
            this.disposables[i].dispose();
        }
        this.disposables = [];
    }
});
var sardModule30 = {}; 
var sardVar19 = sardModule0, sardVar20 = sardModule6, sardVar21 = sardModule8, sardVar22 = sardModule17, Janitor = sardModule28.Janitor;

var Collection = sardVar19({
    __construct: function(ops) {
        this._ops = ops || {};
        this._routes = this._newRoute();
        this._middleware = this._newRoute();
        this._routeIndex = 0;
    },
    has: function(expr) {
        var routes = this.routes(expr);
        for (var i = routes.length; i--; ) {
            if (routes[i].target) return true;
        }
        return false;
    },
    route: function(channel) {
        return this._route(channel.paths);
    },
    routes: function(expr) {
        var channels = expr.channels, routes = [];
        for (var i = channels.length; i--; ) {
            routes.push(this.route(channels[i]));
        }
        return routes;
    },
    add: function(expr, callback) {
        var janitor = new Janitor;
        for (var i = expr.channels.length; i--; ) {
            janitor.addDisposable(this._add(expr.channels[i], expr.meta, callback));
        }
        return janitor;
    },
    _add: function(channel, meta, callback) {
        var paths = channel.paths, isMiddleware = channel.isMiddleware, middleware = channel.thru, currentRoute = this._start(paths, isMiddleware ? this._middleware : this._routes);
        var before = this._before(paths, currentRoute);
        if (middleware) this._endMiddleware(middleware).thru = before;
        var listener = {
            callback: callback,
            meta: meta,
            id: "r" + this._routeIndex++,
            thru: middleware || before,
            path: paths,
            dispose: function() {
                var i = currentRoute.listeners.indexOf(listener);
                if (i > -1) currentRoute.listeners.splice(i, 1);
            }
        };
        currentRoute.meta = sardVar19.copy(meta, currentRoute.meta);
        if (isMiddleware) this._injectMiddleware(listener, paths);
        if (!currentRoute.listeners) currentRoute.listeners = [];
        currentRoute.listeners.push(listener);
        return listener;
    },
    _endMiddleware: function(target) {
        var current = target || {};
        while (current.thru) {
            current = current.thru;
        }
        return current;
    },
    _injectMiddleware: function(listener, paths) {
        listener.level = paths.length;
        var afterListeners = this._after(paths, this._routes).concat(this._after(paths, this._middleware));
        for (var i = afterListeners.length; i--; ) {
            var currentListener = afterListeners[i];
            var currentMiddleware = currentListener.thru, previousMiddleware = currentListener;
            while (currentMiddleware) {
                if (currentMiddleware.level != undefined) {
                    if (currentMiddleware.level < listener.level) {
                        previousMiddleware.thru = listener;
                    }
                    break;
                }
                previousMiddleware = currentMiddleware;
                currentMiddleware = currentMiddleware.thru;
            }
            if (!currentMiddleware) previousMiddleware.thru = listener;
        }
    },
    _before: function(paths, after) {
        var current = this._middleware._route, listeners = [];
        for (var i = 0, n = paths.length; i < n; i++) {
            if (current.listeners) listeners = current.listeners;
            var path = paths[i], newCurrent = path.param ? current._param : current[path.name];
            if (!newCurrent || !newCurrent._route || !newCurrent._route.listeners) break;
            current = newCurrent._route;
            if (current != after) listeners = current.listeners;
        }
        return listeners[0];
    },
    _after: function(paths, routes) {
        return this._flatten(this._start(paths, routes));
    },
    _route: function(paths, routes, create) {
        var current = (routes || this._routes)._route;
        for (var i = 0, n = paths.length; i < n; i++) {
            var path = paths[i], name = path.param ? "_param" : path.name;
            if (!current[name] && create) {
                current[name] = this._newRoute(i);
            }
            if (current[name]) {
                current = current[name];
            } else {
                current = current._param;
            }
            if (!current) return {};
            current = current._route;
        }
        return current;
    },
    _start: function(paths, routes) {
        return this._route(paths, routes, true);
    },
    _newRoute: function(level) {
        return {
            _route: {},
            _level: level || 0
        };
    },
    _flatten: function(route) {
        var listeners = route.listeners ? route.listeners.concat() : [];
        for (var path in route) {
            listeners = listeners.concat(this._flatten(route[path]._route || {}));
        }
        return listeners;
    }
});

sardModule30 = Collection;
var sardModule32 = {}; 
var sardVar4 = sardModule0, sardVar7 = sardModule6, sardVar9 = sardModule8, sardVar14 = sardModule13, sardVar18 = sardModule17, sardVar31 = sardModule30;

var Router = sardVar4({
    __construct: function(ops) {
        if (!ops) ops = {};
        this.RequestClass = ops.RequestClass || sardVar18;
        this._collection = new sardVar31(ops);
        this._allowMultiple = !!ops.multi;
    },
    on: function(expr, ops, callback) {
        if (!callback) {
            callback = ops;
            ops = null;
        }
        for (var i = expr.channels.length; i--; ) {
            var single = sardVar9.channel(expr, i), existingRoute = this.getRoute(single);
            if (existingRoute.listeners.length && !this._allowMultiple && !this._middleware().allowMultiple(single)) {
                if (existingRoute.listeners[0].meta.overridable) {
                    existingRoute.listeners[0].dispose();
                } else {
                    throw new Error('Path "' + sardVar9.pathToString(single.channel.paths) + '" already exists');
                }
            }
            this._middleware().setRoute(channel);
        }
        return this._collection.add(expr, callback);
    },
    _middleware: function() {
        return this.controller.metaMiddleware;
    },
    hasRoute: function(channel, data) {
        return !!this.getRoute(channel, data).listeners.length;
    },
    hasRoutes: function(expr, data) {
        for (var i = expr.channels.length; i--; ) {
            if (this.hasRoute(sardVar9.channel(expr, i), data)) return true;
        }
        return false;
    },
    getRoute: function(single, data) {
        var route = this._collection.route(single.channel);
        return this._middleware().getRoute({
            expr: single,
            router: this,
            route: route,
            data: data,
            listeners: this._filterRoute(single, route)
        });
    },
    dispatch: function(expr, data, ops, callback) {
        for (var i = expr.channels.length; i--; ) {
            if (this._dispatch(sardVar9.channel(expr, i), data, ops, callback)) return true;
        }
        return false;
    },
    _dispatch: function(expr, data, ops, callback) {
        if (data instanceof Function) {
            callback = data;
            data = undefined;
            ops = undefined;
        }
        if (ops instanceof Function) {
            callback = ops;
            ops = undefined;
        }
        if (!ops) ops = {};
        if (!data) data = {};
        var inf = this.getRoute(expr, data);
        if (!inf.listeners.length) {
            if (!ops.ignoreWarning && !expr.meta.passive) console.warn('The %s route "%s" does not exist', expr.type, sardVar9.pathToString(expr.channel.paths));
            if (expr.meta.passive && callback) {
                callback(null, "Route Exists");
            }
            return false;
        }
        var newOps = {
            router: this.controller,
            origin: this,
            data: inf.data,
            inner: ops.inner || {},
            paths: inf.expr.channel.paths,
            meta: expr.meta,
            from: ops.from || this.controller,
            listeners: inf.listeners,
            callback: callback
        };
        sardVar4.copy(newOps, ops, true);
        this._callListeners(ops);
        return true;
    },
    _callListeners: function(newOps) {
        for (var i = newOps.listeners.length; i--; ) {
            sardVar4.copy(newOps, new this.RequestClass(newOps.listeners[i], newOps), true).init().next();
        }
    },
    _filterRoute: function(expr, route) {
        if (!route) return [];
        var listeners = (route.listeners || []).concat();
        for (var name in expr.meta) {
            var value = expr.meta[name];
            if (value === 1) continue;
            for (var i = listeners.length; i--; ) {
                var listener = listeners[i];
                if (listener.meta[name] != value) {
                    listeners.splice(i, 1);
                }
            }
        }
        if (!this._allowMultiple && listeners.length) {
            return [ listeners[0] ];
        }
        return listeners;
    }
});

sardModule32 = Router;
var sardModule36 = {}; 
var sardVar35 = sardModule26;

sardModule36.EventEmitter = {
    __construct: function() {
        this._listeners = {};
    },
    addListener: function(type, callback) {
        (this._listeners[type] || (this._listeners[type] = [])).push(callback);
        var self = this;
        return {
            dispose: function() {
                self.removeListener(type, callback);
            }
        };
    },
    hasEventListener: function(type, callback) {
        return !!this._listeners[type];
    },
    getNumListeners: function(type, callback) {
        return this.getEventListeners(type).length;
    },
    removeListener: function(type, callback) {
        var lists = this._listeners[type], i, self = this;
        if (!lists) return;
        if ((i = lists.indexOf(callback)) > -1) {
            lists.splice(i, 1);
            if (!lists.length) {
                delete self._listeners[type];
            }
        }
    },
    getEventListeners: function(type) {
        return this._listeners[type] || [];
    },
    removeListeners: function(type) {
        delete this._listeners[type];
    },
    removeAllListeners: function() {
        this._listeners = {};
    },
    dispose: function() {
        this._listeners = {};
    },
    emit: function() {
        var args = [], type = arguments[0], lists;
        for (var i = 1, n = arguments.length; i < n; i++) {
            args[i - 1] = arguments[i];
        }
        if (lists = this._listeners[type]) for (var i = lists.length; i--; ) {
            lists[i].apply(this, args);
        }
    }
};

sardModule36.EventEmitter = sardVar35(sardModule36.EventEmitter);
var sardModule38 = {}; 
var sardVar34 = sardModule0, EventEmitter = sardModule36.EventEmitter;

var proto = {
    _init: function(ttl) {
        this._em = new EventEmitter;
        this.response = {};
        if (ttl) {
            this.cache(ttl);
        }
    },
    cache: function(ttl) {
        if (this._caching) return;
        this._caching = true;
        var buffer = this._buffer = [], self = this;
        this.on({
            write: function(chunk) {
                buffer.push(chunk);
            }
        });
    },
    on: function(listeners) {
        for (var type in listeners) {
            this._em.addListener(type, listeners[type]);
        }
    },
    "second on": function(type, callback) {
        this._em.addListener(type, callback);
    },
    respond: function(data) {
        sardVar34.copy(data, this.response, true);
        return this;
    },
    error: function(data) {
        if (!data) return this._error;
        this._error = data;
        this._em.emit("error", data);
        return this;
    },
    _sendResponse: function() {
        if (!this._sentResponse) {
            this.response = JSON.parse(JSON.stringify(this.response));
            this._em.emit("response", this.response);
        }
    },
    write: function(data) {
        this._sendResponse();
        this._em.emit("write", data);
        return this;
    },
    end: function(data) {
        if (data) this.write(data);
        this._sendResponse();
        this.finished = true;
        this._em.emit("end", data);
        this._em.dispose();
        return this;
    },
    pipe: function(stream) {
        if (stream.response) stream.response = this.response;
        if (this._buffer && this._buffer.length) {
            for (var i = 0, n = this._buffer.length; i < n; i++) {
                stream.write(this._buffer[i]);
            }
        }
        if (this.finished) {
            return stream.end();
        }
        this.on({
            write: function(data) {
                stream.write(data);
            },
            end: function() {
                stream.end();
            },
            error: function(e) {
                if (stream.error) stream.error(e);
            },
            response: function(data) {
                if (stream.respond) stream.respond(data);
            }
        });
    }
};

var Stream = sardVar34(sardVar34.copy(proto, {
    __construct: function(ttl) {
        this._init(ttl);
    }
}));

Stream.proto = proto;

sardModule38 = Stream;
var sardModule40 = {}; 
var sardVar33 = sardModule32, sardVar39 = sardModule38;

var PushRouter = sardVar33.extend({
    "override on": function(expr, ops, callback) {
        if (!callback) {
            callback = ops;
            ops = {};
        }
        var ret = this._super(expr, ops, callback);
        if (expr.meta.pull) {
            this.controller.pull(expr, ops.data, {
                ignoreWarning: true
            }, callback);
        }
        return ret;
    },
    "override _callListeners": function(ops) {
        var stream = new sardVar39(true), callback = ops.callback || function(stream) {
            return ops.data;
        };
        var ret = callback(stream);
        if (ret != undefined) {
            stream.end(ret);
        }
        ops.stream = stream;
        this._super.apply(this, arguments);
    }
});

sardModule40 = PushRouter;
var sardModule46 = {}; 
var sardVar43 = sardModule17, sardVar44 = sardModule38, sardVar45 = sardModule0;

var PushPullRequest = sardVar43.extend(sardVar45.copy(sardVar44.proto, {
    init: function() {
        this._init();
        return this;
    },
    _listen: function(listener, meta) {
        if (!meta.stream) {
            var buffer = [], self = this;
            function end(err) {
                if (err) return;
                if (meta.batch) {
                    listener.call(self, buffer, err, self);
                } else {
                    if (!buffer.length) {
                        listener();
                    } else for (var i = 0, n = buffer.length; i < n; i++) {
                        listener.call(self, buffer[i], err, self);
                    }
                }
            }
            this.pipe({
                write: function(data) {
                    buffer.push(data);
                },
                error: end,
                end: end
            });
        } else {
            listener.call(this, this);
        }
    }
}));

sardModule46 = PushPullRequest;
var sardModule48 = {}; 
var sardVar42 = sardModule38, sardVar47 = sardModule46;

var PushRequest = sardVar47.extend({
    "override init": function() {
        this._super();
        this.cache();
        this.stream.pipe(this);
        return this;
    },
    "override _callback": function(route, data) {
        this._listen(route.callback, route.meta);
    }
});

sardModule48 = PushRequest;
var sardModule50 = {}; 
var sardVar41 = sardModule40, sardVar49 = sardModule48;

sardModule50.types = [ "push" ];

sardModule50.test = function(expr) {
    return expr.type == "push" ? "push" : null;
};

sardModule50.newRouter = function() {
    return new sardVar41({
        multi: true,
        RequestClass: sardVar49
    });
};
var sardModule55 = {}; 
var sardVar53 = sardModule46, sardVar54 = sardModule0;

var PullRequest = sardVar53.extend({
    "override init": function() {
        this._super();
        this._listen(this.callback, this.meta);
        return this;
    },
    "override _callback": function() {
        var ret = this._super.apply(this, arguments);
        if (ret != undefined) {
            this.end(ret);
        }
    }
});

sardModule55 = PullRequest;
var sardModule57 = {}; 
var sardVar52 = sardModule32, sardVar56 = sardModule55;

sardModule57.types = [ "pull", "pullMulti" ];

sardModule57.test = function(expr) {
    if (expr.type == "pullMulti") return "pullMulti";
    return expr.type == "pull" ? expr.meta.multi ? "pullMulti" : "pull" : null;
};

sardModule57.newRouter = function(type) {
    var ops = {
        RequestClass: sardVar56
    };
    if (type == "pullMulti") ops.multi = true;
    return new sardVar52(ops);
};
var sardModule60 = {}; 
var sardVar59 = sardModule32;

sardModule60.types = [ "dispatch" ];

sardModule60.test = function(expr) {
    return !expr.type || expr.type == "dispatch" ? "dispatch" : null;
};

sardModule60.newRouter = function() {
    return new sardVar59({
        multi: true
    });
};
var sardModule62 = {}; 
var sardVar3 = sardModule0;

sardModule62 = function(controller) {
    var mw = new sardModule62.Middleware(controller);
    mw.add(sardModule50);
    mw.add(sardModule57);
    mw.add(sardModule60);
    return mw;
};

sardModule62.Middleware = sardVar3({
    __construct: function(controller) {
        this._middleware = [];
        this._controller = controller;
        this._routers = {};
        this.types = [];
    },
    add: function(module) {
        this._middleware.push(module);
        this.types = module.types.concat(this.types);
        for (var i = module.types.length; i--; ) {
            this._controller._createTypeMethod(module.types[i]);
        }
    },
    router: function(expr) {
        for (var i = this._middleware.length; i--; ) {
            var mw = this._middleware[i], name = mw.test(expr);
            if (name) return this._router(mw, name);
        }
        return null;
    },
    _router: function(tester, name) {
        return this._routers[name] || this._newRouter(tester, name);
    },
    _newRouter: function(tester, name) {
        var router = tester.newRouter(name);
        router.type = name;
        router.controller = this._controller;
        this._routers[name] = router;
        return router;
    }
});
var sardModule68 = {}; 
var sardVar2 = sardModule0, sardVar63 = sardModule62, sardVar64 = sardModule13, sardVar65 = sardModule6, Janitor = sardModule28.Janitor, sardVar67 = sardModule8;

var AbstractController = sardVar2({
    __construct: function(target) {
        this.metaMiddleware = sardVar64(this);
        this.routeMiddleware = sardVar63(this);
        this._channels = {};
    },
    has: function(type, ops) {
        var expr = this._parse(type, ops);
        return this._router(expr).hasRoutes(expr);
    },
    getRoute: function(type, ops) {
        var expr = this._parse(type, ops);
        return this._router(expr).getRoute(sardVar67.channel(expr, 0));
    },
    on: function(target) {
        var ja = new Janitor;
        for (var type in target) {
            ja.addDisposable(this.on(type, {}, target[type]));
        }
        return ja;
    },
    "second on": function(type, callback) {
        return this.on(type, {}, callback);
    },
    "third on": function(type, ops, callback) {
        var expr = this._parse(type, ops), router = this.routeMiddleware.router(expr);
        for (var i = expr.channels.length; i--; ) {
            var pathStr = sardVar67.pathToString(expr.channels[i].paths);
            if (!this._channels[pathStr]) {
                this.addChannel(pathStr, sardVar67.channel(expr, i));
            }
        }
        return router.on(expr, ops, callback);
    },
    channels: function() {
        return this._channels;
    },
    addChannel: function(path, singleChannel) {
        this._channels[path] = singleChannel;
    },
    _parse: function(type, ops) {
        var expr = typeof type != "object" ? sardVar65.parse(type) : type;
        if (ops) {
            if (ops.meta) sardVar2.copy(ops.meta, expr.meta);
            if (ops.type) expr.type = ops.type;
        }
        return expr;
    },
    _router: function(expr) {
        return this.routeMiddleware.router(expr);
    },
    _createTypeMethod: function(method) {
        var self = this;
        this[method] = function(type, data, ops, callback) {
            if (!ops) ops = {};
            ops.type = method;
            var expr = this._parse(type, ops);
            return self._router(expr).dispatch(expr, data, ops, callback);
        };
    }
});

var ConcreteController = AbstractController.extend({
    "override __construct": function() {
        this._super();
        var self = this;
        this.on({
            "pull channels": function() {
                return self.channels();
            }
        });
    },
    "override addChannel": function(path, singleChannel) {
        this._super(path, singleChannel);
        var toPush = {};
        toPush[path] = singleChannel;
        this.push("channels", toPush, {
            ignoreWarning: true
        });
    }
});

sardModule68 = ConcreteController;
var sardModule70 = {}; 
var sardVar1 = sardModule0, sardVar69 = sardModule68;

try {
    require.paths.unshift(__dirname + "/beans");
} catch (e) {}

var Loader = sardVar69.extend({
    "override __construct": function() {
        this._super();
        this._params = {};
    },
    params: function(params) {
        sardVar1.copy(params || {}, this._params);
        return this;
    },
    require: function(source) {
        if (source instanceof Array) {
            for (var i = source.length; i--; ) {
                this.require(source[i]);
            }
        } else if (typeof src == "object" && typeof src.bean == "function") {
            source.plugin(this._controller, source.params || this._params[source.name] || {});
        } else {
            return false;
        }
        return this;
    }
});

sardModule70 = Loader;
var sardModule72 = {}; 
var sardVar71 = sardModule70;

sardModule72.router = function() {
    return new sardVar71;
};

sardModule72.router().copyTo(sardModule72, true);
var sardModule78 = {}; 
var sardVar74 = sardModule0, EventEmitter = sardModule36.EventEmitter, sardVar76 = sardModule68, Janitor = sardModule28.Janitor;

var Message = sardVar74({
    __construct: function(name, manager) {
        this._name = name;
        this._manager = manager;
        this._data = {};
    },
    action: function(value) {
        this._action = value;
        return this;
    },
    data: function(value) {
        this._data = value;
        return this;
    },
    send: function(action, value) {
        if (action) {
            this.action(action);
            this.data(value);
        }
        var self = this;
        this._manager._connection._target.send(sardVar74.copy(this._buildMessage()), function(err, result) {
            if (err) {
                self.onError(err);
            }
        });
        return this;
    },
    onError: function(e) {},
    _buildMessage: function() {
        return {
            name: this._name,
            action: this._action,
            data: this._data
        };
    }
});

var Transaction = Message.extend({
    "override __construct": function(name, uid, manager) {
        this._super(name, manager);
        this._uid = uid;
        this._manager = manager;
        var em = this._em = new EventEmitter, oldDispose = this._em.dispose, self = this;
        this._em.dispose = function() {
            this.disposed = true;
            oldDispose.call(em);
            self.dispose();
        };
    },
    "override _buildMessage": function() {
        var message = this._super();
        message.uid = this._uid;
        return message;
    },
    response: function(message) {
        this._em.emit(message.action, message.data);
        return this;
    },
    on: function(listen) {
        for (var type in listen) {
            this.on(type, listen[type]);
        }
        return this;
    },
    "second on": function(type, listener) {
        this._em.addListener(type, listener);
        return this;
    },
    register: function() {
        this._manager._addTransaction(this);
        return this;
    },
    onError: function(e) {
        this._em.emit("error", e);
    },
    disposeOn: function(type) {
        var self = this;
        return this.on(type, function() {
            self.dispose();
        });
    },
    dispose: function() {
        if (!this._em.disposed) this._em.dispose();
        this._manager.remove(this._uid);
    }
});

var CommunicationManager = sardVar74({
    __construct: function(connection) {
        this._connection = connection;
        this._liveTransactions = {};
        this._connection._target.onMessage = this.getMethod("onMessage");
        this._em = new EventEmitter;
    },
    message: function(name) {
        return new Message(name, this);
    },
    on: function(listen) {
        for (var type in listen) {
            this._em.addListener(type, listen[type]);
        }
    },
    onMessage: function(message) {
        var trans = this._liveTransactions[message.uid];
        this._connection._hook.ignore(message.name, true);
        if (trans) {
            trans.response(message);
        } else {
            var msg;
            if (message.uid) {
                msg = this.request(message).action(message.action).data(message.data);
            } else {
                msg = this.message(message.name).action(message.action).data(message.data);
            }
            this._em.emit(msg._action, msg);
        }
        this._connection._hook.ignore(message.name, false);
        return false;
    },
    onDisconnect: function(err) {
        for (var uid in this._liveTransactions) {
            var transaction = this._liveTransactions[uid];
            transaction.response({
                action: "error",
                data: "unable to fullfill request"
            }).dispose();
        }
    },
    transaction: function(name) {
        return (new Transaction(name, this._uid(), this)).register();
    },
    request: function(message) {
        return new Transaction(message.name, message.uid, this);
    },
    remove: function(uid) {
        var trans = this._liveTransactions[uid];
        delete this._liveTransactions[uid];
        return trans;
    },
    _addTransaction: function(trans) {
        this._liveTransactions[trans._uid] = trans;
    },
    _uid: function() {
        var uid = (new Date).getTime() + "." + Math.round(Math.random() * 99999);
        while (this._liveTransactions[uid]) uid = this._uid();
        return uid;
    }
});

var RemoteInvoker = sardVar74({
    __construct: function(hook) {
        this._janitor = new Janitor;
        this._hook = hook;
        this.remote = Math.random();
        var self = this;
        this._hook._router.on("push -pull hook", {
            data: {
                all: hook._target.bussed
            }
        }, function(hook) {
            self._hook._transaction().send("hook", hook).dispose();
        });
        this.reset();
    },
    reset: function() {
        this.dispose();
        this._janitor.addDisposable(this._virtualRouter = new sardVar76);
        this.push = this._virtualRouter.getMethod("push");
        this.pull = this._virtualRouter.getMethod("pull");
        var self = this;
    },
    dispose: function() {
        this._janitor.dispose();
    },
    hook: function(type, channel) {
        switch (type) {
          case "push":
            return this._hookPush(channel);
          case "pull":
            return this._hookPull(channel);
          default:
            return null;
        }
    },
    _hookPull: function(channel) {
        var self = this;
        this._janitor.addDisposable(this._virtualRouter.on("pull -stream " + channel, function(request) {
            this.wrap();
            if (!this.inner.key) this.inner.key = self.id;
            self._hook._transaction(channel).send("pull", {
                hasNext: this.hasNext(),
                data: this.data,
                inner: this.inner
            }).on(this).on({
                next: this.next
            }).disposeOn("end");
        }));
    },
    _hookPush: function(channel) {
        var self = this;
        this._janitor.addDisposable(this._virtualRouter.on("push -stream " + channel, function() {
            if (!this.inner.key) this.inner.key = self.id;
            var trans = self._hook._transaction(channel).send("push", {
                hasNext: this.hasNext(),
                inner: this.inner
            }).on({
                next: this.next
            });
            this.pipe({
                write: function(chunk) {
                    trans.send("write", chunk);
                },
                end: function() {
                    trans.send("end").dispose();
                }
            });
        }));
    }
});

var LocalInvoker = sardVar74({
    __construct: function(connection) {
        this._con = connection;
        this._router = connection._router;
        this._janitor = new Janitor;
    },
    hook: function(type, channel, ops) {
        var self = this, remoteMethod = this._con._remote.getMethod(type);
        if (!ops) ops = {};
        if (!ops.meta) ops.meta = {};
        ops.meta.stream = true;
        this._janitor.addDisposable(this._router.on(type + " " + channel, ops, function(localRequest) {
            if (self._con._hook.ignore(channel) && (!self._con._target.bussed || !this.inner.key || !self._con._remote.id || self._con._remote.id == this.inner.key)) return;
            var _next = this.hasNext() ? function() {
                localRequest.next();
            } : null;
            remoteMethod(channel, localRequest.data, {
                meta: {
                    stream: true
                },
                _next: _next,
                inner: this.inner
            }, function(remoteRequest) {
                if (type == "pull") {
                    remoteRequest.pipe(localRequest);
                } else {
                    localRequest.pipe(remoteRequest);
                }
            });
        }));
    },
    reset: function() {
        this._janitor.dispose();
    },
    dispose: function() {
        this._janitor.dispose();
    },
    push: function(trans) {
        this._router.push(" -stream " + trans._name, {}, {
            from: this._con._remote,
            meta: this._meta(trans, "push"),
            _next: this._next(trans),
            inner: this._inner(trans)
        }, function(stream) {
            trans.register().on(stream.wrap()).disposeOn("end");
        });
    },
    pull: function(trans) {
        var id = this._con._remote.id;
        this._router.pull(" -stream " + trans._name, trans._data.data, {
            from: this._con._remote,
            meta: this._meta(trans, "pull"),
            _next: this._next(trans),
            inner: this._inner(trans)
        }, function() {
            this.pipe({
                respond: function(response) {
                    trans.send("respond", response);
                },
                write: function(chunk) {
                    trans.send("write", chunk);
                },
                end: function(err) {
                    trans.send("end");
                    trans.dispose();
                }
            });
        });
    },
    _next: function(trans) {
        return trans._data.hasNext ? function() {
            trans.send("next");
        } : null;
    },
    _inner: function(trans) {
        if (!trans._data.inner.key) trans._data.inner.key = this._con._remote.id;
        return trans._data.inner;
    },
    _meta: function(trans, type) {
        var inner = this._inner(trans);
        if (inner.key != this._con._remote.id && this._router.has(trans._name, {
            type: type,
            meta: {
                target: inner.key
            }
        })) {
            return {
                target: inner.key
            };
        }
        return null;
    }
});

var Connection = sardVar74({
    __construct: function(target, hook) {
        this._target = target;
        this._hook = hook;
        this._router = hook._router;
        this._comm = new CommunicationManager(this);
        this._janitor = new Janitor;
        this._local = (new LocalInvoker(this)).wrap();
        this._remote = new RemoteInvoker(this);
        this.janitor = new Janitor;
        this._comm.on({
            push: this._local.push,
            pull: this._local.pull,
            hook: this.getMethod("onHook")
        });
        this._onClose();
    },
    _onClose: function() {
        var self = this;
        this._target.onExit = function(err) {
            self._comm.onDisconnect();
            self.dispose();
        };
    },
    onHook: function(trans) {
        this._reset();
        var self = this, hook = trans._data;
        for (var i = hook.channels.length; i--; ) {
            try {
                self._listen(hook.channels[i], hook);
            } catch (e) {}
        }
        this._connected();
        return this;
    },
    hook: function(type, path, ops) {
        this._remote.hook(type, path, ops);
        this._local.hook(type, path, ops);
    },
    _connected: function() {
        if (this._dispatchedConnected) return;
        this._dispatchedConnected = true;
        this._router.push("hook/connection", null, {
            from: this._remote
        });
    },
    _listen: function(channel, hook) {
        var ops = {
            meta: sardVar74.copy(channel.meta || {})
        }, meta = ops.meta;
        ops.meta.pull = ops.meta.rotate = ops.meta.bussed = undefined;
        ops.meta.stream = ops.meta.hooked = ops.meta.overridable = ops.meta["public"] = 1;
        if (this._target.bussed) {
            ops.meta.bussed = 1;
        }
        meta.target = this._remote.id = hook.id;
        this.hook("push", channel.path, ops);
        var route = this._router.getRoute("pull " + channel.path, ops);
        if (route && route.route && route.route.meta) {
            if (route.route.meta.hooked == undefined && !route.router._allowMultiple) {
                return console.warn("local channel %s exists. Cannot hook remote channel.", channel.path);
            }
        }
        this.hook("pull", channel.path, ops);
    },
    _reset: function() {
        this._remote.reset();
        this._local.reset();
    },
    dispose: function() {
        this._remote.dispose();
        this._local.dispose();
        this.janitor.dispose();
    },
    _response: function(message) {
        return this._comm.response(message);
    },
    _transaction: function(name) {
        return this._comm.transaction(name);
    },
    _message: function(name) {
        return this._comm.message(name);
    }
});

var Hook = sardVar74({
    __construct: function(transport, router) {
        this._router = router;
        var connections = this._connections = [], self = this;
        transport.connect(function(connection) {
            var con = new Connection(connection, self);
            connections.push(con);
            con.janitor.addDisposable({
                dispose: function() {
                    var i = connections.indexOf(con);
                    if (i > -1) connections.splice(i, 1);
                }
            });
        });
    },
    ignore: function(name, value) {
        if (!this._ignoring) this._ignoring = [];
        var i = this._ignoring.indexOf(name);
        if (value == undefined) return i > -1;
        if (!value && i > -1) {
            this._ignoring.splice(i, 1);
        } else if (value && i == -1) {
            this._ignoring.push(name);
        }
    }
});

sardModule78 = Hook;
var sardModule80 = {}; 
sardModule80.callback = function(callback, timeout) {
    var interval;
    return function() {
        clearTimeout(interval);
        var args = arguments;
        interval = setTimeout(function() {
            callback.apply(callback, args);
        }, timeout);
    };
};

sardModule80.lazy = {
    callback: sardModule80.callback
};
var sardModule82 = {}; 
var sardVar79 = sardModule78, sardVar81 = sardModule80;

sardModule82.plugin = function(mediator, host) {
    var oldAddChannel = mediator.addChannel, readyBeans = {}, identifier;
    mediator.addChannel = function(path, expr) {
        oldAddChannel.apply(mediator, arguments);
        lazyPush();
    };
    function init() {
        mediator.pullMulti("hook/transport", function(transport) {
            new sardVar79(transport, mediator);
        });
    }
    function onBeanReady(name) {
        readyBeans[name] = 1;
        mediator.on("pull " + name + "/ready", {
            meta: {
                "public": 1,
                rotate: 1
            }
        }, function() {
            return true;
        });
    }
    function getHook(data) {
        var d = data || {};
        var channels = [], ch = mediator.channels();
        for (var channel in ch) {
            var expr = ch[channel];
            if (!d.all && !expr.meta.bussed && expr.meta.hooked || !expr.meta["public"]) continue;
            channels.push({
                meta: expr.meta,
                path: channel
            });
        }
        var info = {
            id: identifier,
            channels: channels
        };
        return info;
    }
    function pullHook(request) {
        return getHook(request.data);
    }
    function pushHook() {
        mediator.push("hook", getHook());
    }
    var lazyPush = sardVar81.callback(pushHook, 1);
    function onAppId(data) {
        console.log(data);
    }
    function setId(value) {
        identifier = value;
        pushHook();
    }
    function onConnection(data) {
        for (var bean in readyBeans) {
            this.from.push(bean + "/ready", true, {
                ignoreWarning: true
            });
        }
    }
    mediator.on({
        "push init": init,
        "push ready": onBeanReady,
        "pull hook": pullHook,
        "push set/id": setId,
        "push hook/connection": onConnection
    });
};
var sardModule85 = {}; 
var sardVar84 = sardModule0;

sardModule85 = sardVar84({
    __construct: function(socket) {
        this._socket = socket;
        this._id = socket.id;
        var self = this;
        socket.on("message", function(batch) {
            batch.forEach(function(msg) {
                self.onMessage(msg);
            });
        });
        socket.on("disconnect", function() {
            console.log("socket disconnect :%d", self._id);
            self.onExit();
        });
    },
    send: function(message, callback) {
        if (!this._batch) {
            this._batch = [];
            setTimeout(this.getMethod("_sendBatch"), 1);
        }
        this._batch.push(message);
    },
    _sendBatch: function() {
        this._socket.json.send(this._batch);
        this._batch = null;
    },
    onExit: function() {},
    onMessage: function() {}
});
var sardModule87 = {}; 
var sardVar86 = sardModule85;

sardModule87.plugin = function(router) {
    return {
        connect: function(onConnection) {
            var socket = io.connect("http://localhost:6032"), socket;
            socket.on("connect", function() {
                router.push("set/id", socket.socket.sessionid);
                onConnection(new sardVar86(socket));
            });
        }
    };
};
var sardModule89 = {}; 
var sardVar88 = sardModule87;

sardModule89.plugin = function(router) {
    var con = sardVar88.plugin(router);
    router.on({
        "pull -multi hook/transport": function() {
            return con;
        }
    });
};
var sardModule91 = {}; 
var beanpole = sardModule72.router();

function pluginExample(router) {
    var name = prompt("What's your name?", "craig");
    var time = Number(prompt("When do you want an alert? (in seconds)", 1));
    function appendBody(message) {
        var div = document.createElement("div");
        div.innerHTML = message;
        document.body.appendChild(div);
    }
    router.on({
        "pull -public some/random/callback": function(request) {
            appendBody(request.data.message);
            this.from.push("notify/clients", request.data);
            request.end();
        },
        "push send/message": function(data) {
            beanpole.push("call/later", {
                channel: "some/random/callback",
                data: {
                    _id: (new Date).getTime(),
                    message: data.message
                },
                sendAt: (new Date).getTime() + data.delay
            });
        },
        "push -public notify/clients": function(data) {
            appendBody("notified from another client: " + data.message);
        }
    });
    beanpole.on({
        "push -public -one spice.io/ready": function() {
            beanpole.push("send/message", {
                message: "hello " + name + "!",
                name: name,
                delay: time * 1e3
            });
        }
    });
}

sardModule82.plugin(beanpole);

sardModule89.plugin(beanpole);

pluginExample(beanpole);

beanpole.push("ready", "client");

beanpole.push("init");
