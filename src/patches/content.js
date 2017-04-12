import { Buffer } from 'buffer'

export default async function content (compiler, next) {
  await next()

  const filename = 'lib/' + compiler.options.name + '.js'
  const file = await compiler.readFileAsync(filename)
  const header = '/' + '*'.repeat(19) + 'nexe_'
  const end = '_' + '*'.repeat(19) + '/'
  const padding = Array(compiler.options.padding * 1000000).fill('*').join('')

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
