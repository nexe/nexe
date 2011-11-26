var path = require('path');
var fs = require('fs');

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, mode, f) {
    if (mode === undefined) throw new Error('mode not specified');
    
    var cb = f || function () {};
    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    fs.mkdir(p, mode, function (er) {
        if (!er) return cb();
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), mode, function (er) {
                    if (er) cb(er);
                    else mkdirP(p, mode, cb);
                });
                break;

            case 'EEXIST':
                fs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original EEXIST be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er)
                    else if ((stat.mode & 0777) !== mode) fs.chmod(p, mode, cb);
                    else cb();
                });
                break;

            default:
                cb(er);
                break;
        }
    });
}

mkdirP.sync = function sync (p, mode) {
    if (mode === undefined) throw new Error('mode not specified');
    
    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);
    
    try {
        fs.mkdirSync(p, mode)
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                var err1 = sync(path.dirname(p), mode)
                if (err1) throw err1;
                else return sync(p, mode);
                break;
            
            case 'EEXIST' :
                var stat;
                try {
                    stat = fs.statSync(p);
                }
                catch (err1) {
                    throw err0
                }
                if (!stat.isDirectory()) throw err0;
                else if ((stat.mode & 0777) !== mode) {
                    try {
                        fs.chmodSync(p, mode);
                    }
                    catch (err) {
                        if (err && err.code === 'EPERM') return null;
                        else throw err;
                    }
                    return null;
                }
                else return null;
                break;
            default :
                throw err0
                break;
        }
    }
    
    return null;
};
