/**
 * nexe API "wrapper"
 *
 * @name nexe
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 2.0.0
 * @license MIT
 **/

'use strict';

const path = require('path'),
      fs   = require('fs');

const LIB_DIR = path.join(__dirname, 'lib');

/**
 * Nexe
 * @class
 **/
class Nexe {

  /**
   * Nexe constructor
   *
   * @param {Object} config - nexe configuration object.
   *
   * @constructor
   **/
  constructor(config) {
    let that = this;
    this.libs = {};
    this.config = config;

    // Load our libraries, use sync because bad to use async in constructors
    let libs = fs.readdirSync(LIB_DIR);
    libs.forEach(function(lib) {
      let LIB_PATH = path.join(LIB_DIR, lib);
      let LIB_NAME = path.parse(lib).name;

      // Require and the instance the lib.
      let LIB_CLASS    = require(LIB_PATH);

      // link it unto the nexe class. use that.config for any changes in it.
      that.libs[LIB_NAME] = new LIB_CLASS(that.libs, that.config);
    });


    let console = this.libs.log;
    console.log('nexe initialized.');
  }

  /**
   * Create a executable.
   *
   * @returns {boolean} success status
   **/
  compile(config) {

  }
}


let nexe = new Nexe({
  input: './something.js',
  output: 'out.nexe',
  temp: './temp'
});

nexe.libs.download.downloadNode('latest', (err, location) => {
  if(err) {
    return console.error(err);
  }

  console.log('Node.JS Download to:', location);

  nexe.libs.download.extractNode('latest', err => {
    console.log('Node.JS Extracted.');
  })
});
