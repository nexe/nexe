/**
 * Embedded Files Test
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

const nexeres = require('nexeres');

process.stdout.write(nexeres.get('hw.txt').toString('ascii'));
