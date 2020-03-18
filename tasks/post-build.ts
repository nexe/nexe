import { writeFileSync, readFileSync } from 'fs'
import { template } from 'lodash'

/**
 * post build step to insert code files into code files (naively).
 * '{{replace:path/to/file}}' => "file contents"
 * And the package.json version.
 */
//inject('plugins/nexe-daemon/lib/index.js')
cp('src/fs/package.json', 'lib/fs/package.json')
cp('src/fs/bootstrap.js', 'lib/fs/bootstrap.js')
cp('src/fs/README.md', 'lib/fs/README.md')

inject('lib/patches/third-party-main.js')
inject('lib/steps/shim.js')
inject('lib/options.js', JSON.stringify(require('../package.json').version))

function inject(filename: string, ...replacements: string[]) {
  let contents = readFileSync(filename, 'utf8')
  contents = template(contents, {
    interpolate: /'\{\{([\s\S]*?)\}\}'/,
    imports: {
      file: (path: string) => JSON.stringify(readFileSync(path, 'utf8')),
      replacements
    }
  })()
  writeFileSync(filename, contents)
  console.log(`Wrote: ${filename}`)
}

function cp(from: string, to: string) {
  const file = readFileSync(from)
  writeFileSync(to, file)
  console.log('Copied: ', from, 'To: ', to)
}
