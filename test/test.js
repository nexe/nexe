/**
 * Test runner for nexe
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

'use strict';

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const spawn  = require('child_process').spawn;

// our vars
const NEXE_VERSION = require('../package.json').version;
const testBase = __dirname;
const LOG_FILE = path.join(testBase, 'test.log');

if(fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

let logfile = fs.createWriteStream(LOG_FILE, {
  autoClose: false
});

const compileTest = function(test, cb) {
  let testDir = path.join(testBase, test);
  if(!fs.existsSync(testDir)) {
    throw new Error('Test not found');
    return cb(false);
  }

  let npminst = spawn('npm', ['install'], {
    cwd: testDir
  });

  npminst.on('error', function() {
    throw new Error('Failed to execute NPM');
    return cb(false);
  });

  npminst.on('close', function(code) {
    if(code !== 0) {
      throw new Error('NPM exited with non-zero status');
      return cb(false);
    }

    let testinst = spawn('../../bin/nexe', [], {
      cwd: testDir
    });

    testinst.on('error', function() {
      throw new Error('Test failed to compile');
      return cb(false);
    });

    testinst.on('close', function(code) {
      let err = null;
      if(code !== 0) {
        throw new Error('Test gave non-zero code');
        err = false;
      }

      logfile = fs.createWriteStream(LOG_FILE);

      return cb(err);
    });
    
    testinst.stdout.on('data', function(d) {
      process.stdout.write(d.toString('ascii'));
    });
  });
};

/**
 * Run a test-generated binary
 *
 * @param {string} test - test name (dir)
 * @param {array} optional args - array of args to pass to the binary
 * @param {function} cb - callback
 **/
const runTest = function(test, args, cb) {
  let testDir = path.join(testBase, test);
  let testBin = path.join(testDir, 'test.nex')

  // check params
  if(!Array.isArray(args)) {
    cb = args;
    args = [];
  }

  if(!fs.existsSync(testDir)) {
    throw new Error('Test not found');
    return cb(false);
  }

  if(!fs.existsSync(testBin)) {
    throw new Error('Test binary not found');
    return cb(false);
  }

  let returned = false;
  let testinst = spawn(testBin, args, {
    cwd: testDir
  })

  testinst.stdout.on('data', function(d) {
    let status = d.toString('ascii');

    if(status === true || status === 'true' || status === 'true\n') {
      testinst.stdin.pause();
      testinst.kill();

      // make it know we returned.
      returned = true;

      return cb();
    }
  })

  testinst.on('close', function(c) {
    if(returned !== true) {
      throw new Error('Test failed (stdout never contained true)');
      return cb(false);
    }
  });
}

console.log('NOTICE: The first test may take awhile as it may compile Node.js');
console.log('        Monitor the log file (test.log) for progress.');


after(function() {
  console.log('notice: closing test.log file descriptor.')
  logfile.end();
});

/**
 * Tests express compatability.
 **/
describe('nexe can bundle express', function() {
  let testname = 'express-test';

  describe('build', function () {
    it('compiles without errors', function (next) {
      compileTest(testname, function(err) {
        return next(err);
      });
    });

    it('runs successfully', function(next) {
      runTest(testname, function(err) {
        return next(err);
      });
    });
  });
});

describe('nexe and embedding files', function() {
  let testname = 'embeded-files';

  describe('build', function () {
    it('compiles without errors', function (next) {
      compileTest(testname, function(err) {
        return next(err);
      });
    });

    it('runs successfully', function(next) {
      runTest(testname, function(err) {
        return next(err);
      });
    });
  });
});

describe('v8 flags test (strict mode)', function() {
  let testname = 'flags-test';

  describe('build', function () {
    it('compiles without errors', function (next) {
      compileTest(testname, function(err) {
        return next(err);
      });
    });

    it('runs successfully', function(next) {
      runTest(testname, function(err) {
        return next(err);
      });
    });
  });
});

describe('nexe can be utilized in gulp test', function() {
  let testname = 'gulp-test-170';

  describe('build', function () {
    it('compiles without errors', function (next) {
      compileTest(testname, function(err) {
        return next(err);
      });
    });

    it('runs successfully', function(next) {
      runTest(testname, function(err) {
        return next(err);
      });
    });
  });
});

describe('nexe can ignore node.js flags test', function() {
  let testname = 'ignoreFlags-test';

  describe('build', function () {
    it('compiles without errors', function (next) {
      compileTest(testname, function(err) {
        return next(err);
      });
    });

    it('runs successfully', function(next) {
      runTest(testname, ['--help'], function(err) {
        return next(err);
      });
    });
  });
});

describe('nexe supports js-yaml test', function() {
  let testname = 'js-yaml-148';

  describe('build', function () {
    it('compiles without errors', function (next) {
      compileTest(testname, function(err) {
        return next(err);
      });
    });

    it('runs successfully', function(next) {
      runTest(testname, function(err) {
        return next(err);
      });
    });
  });
});
