/**
 * Embed files into your node.js executable using base64.
 *
 * @name embed
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

'use strict';

let path = require('path'),
    fs = require('fs');

let DOWNLOAD_DIR;

module.exports = class Embed {
  constructor(libs, config, downloads) {
    this.libs   = libs;
    this.config = config;

    DOWNLOAD_DIR = downloads;
  }

  /**
   * Embed files into node.js.
   *
   * @param {String} version - node.js version.
   * @param {Array} files    - array of files.
   * @param {String} root    - root of files.
   * @param {Object} options - object of options.
   * @param {Function} done  - callback.
   * @returns {undefined} use the callback.
   **/
  files(version, files, root, options, done) {
    let console = this.libs.log;
    let embeddedFiles; // make eslint happy.

    /**
     * Accessort for embed
     * @param {String} key - file name.
     * @returns {*} contents.
     **/
    const accessor = function(key) {
      if (embeddedFiles.hasOwnProperty(key)) {
        return new Buffer(embeddedFiles[key], 'base64');
      }

      //file was not embedded, throw err.
      throw new Error('Embedded file not found');
    }

    /**
     * Embed files.
     *
     * @param {Array} resourceFiles - array of files to embed.
     * @param {String} resourceRoot - root of resources.
     * @param {Object} options - options...
     * @param {Function} complete   - callback
     *
     * @returns {undefined} use callback.
     **/
    function embed(resourceFiles, resourceRoot, options, complete) {
      const encode = (filePath) => {
        return fs.readFileSync(filePath).toString('base64');
      }

      resourceFiles = resourceFiles || [];
      resourceRoot = resourceRoot || '';

      if (!Array.isArray(resourceFiles)) {
        throw new Error('Bad Argument: resourceFiles is not an array');
      }

      let buffer = 'var embeddedFiles = {\n';
      resourceFiles.forEach(file => {
        let filepath = path.relative(resourceRoot, file);

        // add to the buffer.
        console.log('nexe:embed', 'add', file);
        buffer += JSON.stringify(filepath) + ': "';
        buffer += encode(file) + '",\n';
      })

      buffer += '\n};\n\nmodule.exports.keys = function () { return Object.keys(embeddedFiles); }\n\nmodule.exports.get = ';
      buffer += accessor.toString();

      return complete(null, buffer);
    }

    return embed(files, root, options, (err, buffer) => {
      if(err) {
        return done(err);
      }

      let subver = version;
      if(!fs.existsSync(path.join(DOWNLOAD_DIR, 'node', version))) {
        console.log('nexe:patch', 'couldn\'t find version, optimistically assuming latest.');
        subver = 'latest';
      }

      let outPath  = path.join(
        DOWNLOAD_DIR,
        'node',
        subver,
        'node-v'+version,
        'lib/nexeres.js'
      );

      // write the file.
      fs.writeFile(outPath, buffer, done);
    });
  }
}
