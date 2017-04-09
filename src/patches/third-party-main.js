function * main (compiler, next) {
  const mainFile = yield compiler.readFileAsync('lib/_third_party_main.js')
  mainFile.contents = `
    Object.defineProperty(process, '__nexe', {
      value: true,
      enumerable: false,
      configurable: false
    });
    require("${compiler.options.name}");
    `.trim()

  if (compiler.options.empty === true) {
    compiler.options.resources.length = 0
    compiler.input = 'console.log(`nexe-${process.platform}-${process.arch}-${process.version}`)'
    return next()
  }

  return next()
}

module.exports.main = main
