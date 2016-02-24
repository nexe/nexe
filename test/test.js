/**
 * Test runner for nexe
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

'use strict';

const NEXE_VERSION = require('../package.json').version;

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const spawn  = require('child_process').spawn;

let testBase = __dirname;

const compileTest = function(test, cb) {
  let testDir = path.join(testBase, test);
  if(!fs.existsSync(testDir)) {
    throw new Error('Test not found');
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

    return cb(err);
  });
};

const runTest = function(test, cb) {
  let testDir = path.join(testBase, test);
  let testBin = path.join(testDir, 'test.nex')
  if(!fs.existsSync(testDir)) {
    throw new Error('Test not found');
    return cb(false);
  }

  if(!fs.existsSync(testBin)) {
    throw new Error('Test binary not found');
    return cb(false);
  }

  let returned = false;
  let testinst = spawn(testBin, [], {
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
  })
}

console.log('NOTICE: The first test may take awhile as it may compile Node.js');

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

describe('can ignore node.js flags test', function() {
  let testname = 'ignoreFlags-test';

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
