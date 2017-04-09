const Buffer = require('buffer').Buffer

function* content (compiler, next) {
  yield next()

  const filename = 'lib/' + compiler.options.name + '.js',
    file = yield compiler.readFileAsync(filename),
    header = '/' + '*'.repeat(19) + 'nexe_',
    end = '_' + '*'.repeat(19) + '/',
    padding = Array(compiler.options.padding * 1000000).fill('*').join('')

  if (!padding) {
    file.contents = compiler.input
    return
  }

  file.contents = [
    compiler.input,
    '/',
    padding,
    '/'
  ].join('')

  file.contents = header + Buffer.byteLength(file.contents) + end + file.contents
}

module.exports.content = content
