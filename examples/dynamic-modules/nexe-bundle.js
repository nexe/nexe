const { resolve } = require('resolve-dependencies')
const path = require('path')

module.exports.createBundle = async function createBundle (options) {
  console.log(path.isAbsolute(options.input))
  const { entries, files } = await resolve(options.input)
  const lcp = findLcp(Object.keys(files))
  const relFiles = relativize(files, lcp)  
  console.log('LCP', relFiles)
  return Promise.resolve(`console.log('hello world')`)
}

function relativize (files, lcp) {
  const result = {}
  for(const absPath in files) {
    const relPath = '.' + path.sep + path.relative(lcp, absPath)
    const file = files[absPath]
    file.relPath = relPath
    result[relPath] = file
  }
  return result
}

function findLcp(paths, sep = path.sep) {
  let position, first = paths[0] || ''
  findPosition: {
    for (position = 0;; position++) {
      for (let i = 0; i < paths.length; i++) {
        if (paths[i][position] && paths[i][position] === first[position]) 
          continue
        while (position > 0 && first[--position] !== sep) {}        
        break findPosition
      }
    }
  }
  return first.slice(0, position)
}
