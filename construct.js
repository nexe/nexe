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

class Nexe {

  /**
   * Nexe constructor
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

      // link it unto the nexe class.
      that.libs[LIB_NAME] = new LIB_CLASS(this, config);
    });


    let console = this.libs.log;
    console.log('nexe initialized.');
  }

  /**
   * Create a executable.
   *
   * @returns {boolean} success status
   **/
  compile() {

  }
}


let nexe = new Nexe({
  input: './something.js',
  output: 'out.nexe'
});
