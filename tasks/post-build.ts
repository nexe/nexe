import { writeFileSync, readFileSync } from 'fs'
import { template } from 'lodash'

/**
 * post build step to insert code files into code files.
 * And the package.json version.
 */
cp('src/fs/package.json', 'lib/fs/package.json')
cp('src/fs/bootstrap.js', 'lib/fs/bootstrap.js')
cp('src/fs/README.md', 'lib/fs/README.md')

inject('lib/patches/third-party-main.js')
inject('lib/steps/shim.js')
inject('lib/options.js', JSON.stringify(require('../package.json').version))

function inject(filename: string, version?: string) {
  const contents = template(readFileSync(filename, 'utf8'), {
    interpolate: /'\{\{([\s\S]*?)\}\}'/,
  })({
    file: (path: string) => JSON.stringify(readFileSync(path, 'utf8')),
    version,
  })
  writeFileSync(filename, contents)
  console.log(`Wrote: ${filename}`)
}

function cp(from: string, to: string) {
  const file = readFileSync(from)
  writeFileSync(to, file)
  console.log('Copied: ', from, 'To: ', to)
}
