const
  { join, dirname } = require('path'),
  { readdir, stat, readFile, unlink, writeFile } = require('fs'),
  { promisify, map, coroutine } = require('bluebird'),
  mkdirpAsync = promisify(require('mkdirp')),
  statAsync = promisify(stat),
  unlinkAsync = promisify(unlink),
  readdirAsync = promisify(readdir),
  writeAnyFileAsync = promisify(writeFile),
  readFileAsync = promisify(readFile),
  readDirAsync = (dir) => {
    return readdirAsync(dir).map((file) => {
      const path = join(dir, file)
      return statAsync(path).then(s => s.isDirectory() ? readDirAsync(path) : path)
    }).reduce((a, b) => a.concat(b), [])
  },
  maybeReadFileContents = (file) => {
    return readFileAsync(file, 'utf-8')
      .catch(e => {
        if (e.code === 'ENOENT') {
          return ''
        }
        throw e
      })
  }

/**
 * The artifacts step is where source patches are committed, or written as "artifacts"
 * Steps:
 *  - A temporary directory is created in the downloaded source
 *  - On start, any files in that directory are restored into the source tree
 *  - After the patch functions have run, the temporary directory is emptied
 *  - Original versions of sources to be patched are written to the temporary directory
 *  - Finally, The patched files are written into source.
 *
 */
module.exports.artifacts = function* artifacts ({ files, writeFileAsync, src }, next) {
  const temp = join(src, 'nexe')
  yield mkdirpAsync(temp)
  const tmpFiles = yield readDirAsync(temp)

  yield map(tmpFiles, coroutine(function* (path) {
    return writeFileAsync(path.replace(temp, ''), yield readFileAsync(path))
  }))

  yield next()

  yield map(tmpFiles, x => unlinkAsync(x))
  return map(files, coroutine(function* (file) {
    const sourceFile = join(src, file.filename),
      tempFile = join(temp, file.filename),
      fileContents = yield maybeReadFileContents(sourceFile)

    yield mkdirpAsync(dirname(tempFile))
    yield writeAnyFileAsync(tempFile, fileContents)
    yield writeFileAsync(file.filename, file.contents)
  }))
}
