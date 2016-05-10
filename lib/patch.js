/**
 * Contains Various Patches for Node.js Source Code.
 *
 * @name patch
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

 'use strict';

const path  = require('path'),
      fs    = require('fs'),
      async = require('async');

let DOWNLOAD_DIR;

 module.exports = class Patch {
   constructor(libs, config, downloads) {
     this.libs   = libs;
     this.config = config;

     DOWNLOAD_DIR = downloads;
   }

   node(version, done) {
     let console = this.libs.log;

     let subver = version;
     if(!fs.existsSync(path.join(DOWNLOAD_DIR, 'node', version))) {
       console.log('nexe:patch', 'couldn\'t find version, optimistically assuming latest.');
       subver = 'latest';
     }

     let outPath  = path.join(DOWNLOAD_DIR, 'node', subver, 'node-v'+version);

     /**
      * Monkey patch a file.
      *
      * @param {string} filePath - path to file.
      * @param {function} monkeyPatched - function to process contents
      * @param {function} processor - TODO: detail what this is
      * @param {function} complete - callback
      *
      * @return {undefined} use callback.
      */
     let _monkeypatch = function(filePath, monkeyPatched, processor, complete) {
       async.waterfall([
         function read(next) {
           fs.readFile(filePath, "utf8", next);
         },

         // TODO - need to parse gyp file - this is a bit hacker
         function monkeypatch(content, next) {

           if (monkeyPatched(content)) return complete();

           console.log("monkey patch %s", filePath);
           processor(content, next);
         },

         function write (content, next) {
           fs.writeFile(filePath, content, "utf8", next);
         }
       ], complete);
     }

     async.waterfall([
       (next) => {
         let childProcPath = path.join(outPath, 'lib', "child_process.js");

         console.log('patch child_process');
         _monkeypatch(
             childProcPath,
             function (content) {
                 return ~content.indexOf('--child_process');
             },
             function (content, next) {
                 next(null, content.replace(/return spawn\(/, 'args.unshift("--child_process");\n  return spawn('));
             },
             next
         );
       },

       (next) => {
         let mainPath = path.join(outPath, 'src', 'node.js');

         if(!fs.existsSync(mainPath)) {
          console.log('warn',
            'src/node.js doesn\'t exist.',
            'Trying \'lib/internal/bootstrap_node.js\''
          );
          mainPath = path.join(outPath, 'lib/internal', 'bootstrap_node.js');
        }

         console.log('patch node.js')
         _monkeypatch(
           mainPath,
           function (content) {
             return ~content.indexOf('nexe');
           },

           function (content, next) {
             next(null, content.replace(/\(function\(process\) \{/,'(function(process) {\n  process._eval = \'require("nexe");\';\n  process.argv.splice(1, 0, "nexe.js");\n'))
           },
           next
         );
       },

       (next) => {
         let gypPath = path.join(outPath, 'node.gyp');

         console.log('patch node.gyp')
         _monkeypatch(
           gypPath,
           function (content) {
             return ~content.indexOf('nexe.js');
           },
           function (content, next) {
             next(null, content.replace("'lib/fs.js',", "'lib/fs.js', 'lib/nexe.js', 'lib/nexeres.js', "))
           },
           next
         )
       }
     ], err => {
       return done(err);
     });
   }
 }
