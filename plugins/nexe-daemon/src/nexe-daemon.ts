const installCommands = ['-i', '--install']
const installIndex = process.argv.findIndex(x => installCommands.includes(x))
import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'

function mkdirp(r: string, t?: any): any {
  ;(t = t || null), (r = path.resolve(r))
  try {
    fs.mkdirSync(r), (t = t || r)
  } catch (c) {
    if ('ENOENT' === c.code) (t = mkdirp(path.dirname(r), t)), mkdirp(r, t)
    else {
      var i
      try {
        i = fs.statSync(r)
      } catch (r) {
        throw c
      }
      if (!i.isDirectory()) throw c
    }
  }
  return t
}

if (~installIndex) {
  console.log('DIRECTORY FOUND')
  const directory = process.argv[installIndex + 1]
  if (directory) {
    mkdirp(path.dirname(directory))
    const filename = path.join(directory, path.basename(process.execPath))
    const readStream = fs.createReadStream(process.execPath)
    const writeStream = fs.createWriteStream(filename)

    const onError = function() {
      readStream.removeAllListeners()
      writeStream.removeAllListeners()
      //TODO
    }

    readStream
      .on('error', onError)
      .pipe(writeStream)
      .on('error', onError)
      .on('close', () => {
        const winsw = filename.replace('.exe', '-service.exe')
        fs.writeFileSync(winsw, fs.readFileSync('./nexe/plugin/daemon/winsw.exe'))
        fs.writeFileSync(
          filename.replace('.exe', '-service.xml'),
          fs.readFileSync('./nexe/plugin/daemon/winsw.xml')
        )
        installService(winsw)
      })
  }
} else {
  console.log('DIRECTORY NOT FOUND')
  require('./nexe/plugin/daemon/app.js')
}

function installService(filename: string) {
  cp.exec(filename + ' install', error => {
    if (error && !error.message.includes('already exists')) {
      throw error
    }
  })
}
