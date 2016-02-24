/**
 * Test to verify if we support strict mode (flags)
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

 // test.nex --help

 let status = false;

 // console.log(process.argv);

 if(process.argv[2]) {
   status = true;
 }

 console.log(status);
