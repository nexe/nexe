"use strict";

let gulp = require('gulp');
let nexe = require('nexe');

gulp.task( "compile", ( callback ) => {
    let options = {
        input: "index.js",
        output: "test.nex",
        python: "python",
        nodeTempDir: "./tmp",
        nodeVersion: "latest",
        flags: false,
        framework: "nodejs"
    };

    nexe.compile( options, ( err ) => {
        console.log( err );
        callback( err );
    } );
} );

gulp.task('default', ['compile']);
