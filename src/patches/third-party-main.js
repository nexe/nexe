export async function main (compiler, next) {
  const mainFile = await compiler.readFileAsync('lib/_third_party_main.js')
  mainFile.contents = `
    Object.defineProperty(process, '__nexe', {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false
    });
    require("${compiler.options.name}");
    `.trim()

  if (compiler.options.empty === true) {
    compiler.options.resources.length = 0
    //eslint-disable-next-line
    compiler.input = 'console.log(`nexe-${process.platform}-${process.arch}-${process.version}`)'
    return next()
  }

  return next()
}
