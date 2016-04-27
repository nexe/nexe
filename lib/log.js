/**
 * Logger object.
 *
 * @name log
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

'use strict';

module.exports = class Log {
  constructor(nexe) {
    this.nexe = nexe;
    this.logger = require('debug')('nexe');
  }

  log() {
    this.logger.apply(this.logger, arguments);
  }
}
