import { NexeCompiler, NexeOptions } from 'nexe'
import { readFileSync } from 'fs'
import { join } from 'path'

interface NexeDaemonOptions {
  id: string
  name: string
  description: string
  executable: string
}

type DaemonOptions = NexeOptions & { daemon: { windows: NexeDaemonOptions } }

function renderWinswConfig(options: any) {
  return (
    '<configuration>\r\n' +
    `${Object.keys(options).reduce((config: string, element: string) => {
      return (config += `<${element}>${options[element]}</${element}>\r\n`)
    }, '')}</configuration>\r\n`
  )
}

export default function daemon(compiler: NexeCompiler<DaemonOptions>, next: () => Promise<void>) {
  if (compiler.target.platform !== 'windows') {
    return next()
  }
  compiler.addResource(
    './nexe/plugin/daemon/winsw.exe',
    readFileSync(require.resolve('../winsw.exe'))
  )
  const name = compiler.options.name,
    options = (compiler.options.daemon && compiler.options.daemon.windows) || {},
    defaults: NexeDaemonOptions = {
      id: name,
      name,
      description: name,
      executable: '%BASE%\\' + compiler.output
    }

  compiler.addResource(
    './nexe/plugin/daemon/winsw.xml',
    Buffer.from(renderWinswConfig(Object.assign(defaults, options)))
  )
  compiler.addResource('./nexe/plugin/daemon/app.js', Buffer.from(compiler.input))
  compiler.input = '{{replace:plugins/nexe-daemon/lib/nexe-daemon.js}}'

  return next()
}
