/**
 * Compile Node.js from Node.js
 *
 * @name Compile
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

 'use strict';

 const path  = require('path'),
       async = require('async'),
       os    = require('os'),
       spawn = require('child_process').spawn,
       fs    = require('fs');

 let isWin = false;
 let DOWNLOAD_DIR;

 module.exports = class Compile {
   constructor(libs, config, downloads) {
     this.libs   = libs;
     this.config = config;

     DOWNLOAD_DIR = downloads;
   }

   /**
    * Compile a version of Node.js
    *
    * @param {String} version - must be literal, no latest.
    * @param {Function} done  - callback
    * @returns {undefined} use callback.
    **/
    node(version, done) {
     let console = this.libs.log;
     let outPath  = path.join(DOWNLOAD_DIR, 'node', version, 'node-v'+version);

     if(!fs.existsSync(outPath)) {
       console.log('nexe:compile', 'outPath didn\'t exist, trying with latest.')
       outPath = path.join(DOWNLOAD_DIR, 'node', 'latest', 'node-v'+version);

       if(!fs.existsSync(outPath)) {
         console.log('nexe:compile', 'version hasn\'t been downloaded.')
         return done(new Error('Version Not Found.'));
       }
     }

     console.log('nexe:compile', 'found node.js', version, 'in', outPath);

     async.waterfall([
       /**
        * Execute Configure If on Linux.
        **/
       (next) => {
         if(isWin) {
           return next();
         }

         let cfg  = './configure';
         let conf = [cfg];

         // should work for all use cases now.
         let configure = spawn('python', conf, {
           cwd: outPath
         });


         configure.stdout.pipe(process.stdout);
         configure.stderr.pipe(process.stderr);

         configure.on('exit', code => {
           console.log('nexe:compile', 'configure closed with exit code', code);
           return next();
         })
       },

       /**
        * Execute Make on Linux
        **/
       (next) => {
         if(isWin) {
           return next();
         }

         let platformMake = 'make';
         if(os.platform().match(/bsd$/) !== null) {
           platformMake = 'gmake';
         }

         let make = spawn(platformMake, [], {
           cwd: outPath
         });

         make.stdout.pipe(process.stdout);
         make.stderr.pipe(process.stderr);

         make.on('error', function(err) {
           console.log('nexe:compile', 'make failed.')
           return next(err);
         })

         make.on('exit', code => {
           console.log('nexe:compile', 'make exited with code', code);
           return next();
         });
       },

       /**
        * Execute VCBuild (Windows)
        **/
       (next) => {
         if(!isWin) {
           return next();
         }

         // spawn a vcbuild process with our custom enviroment.
         let vcbuild = spawn('vcbuild.bat', ['nosign', 'release'], {
           cwd: outPath
         });

         vcbuild.stdout.pipe(process.stdout);
         vcbuild.stderr.pipe(process.stderr);

         vcbuild.on('exit', code => {
           console.log('nexe:compile', 'vcbuild exited with code', code);
           return next();
         });
       }
     ], err => {
       if(err) {
         console.log('nexe:compile', 'got error via async');
         return done(err);
       }

       return done(false);
     })
   }
 }
