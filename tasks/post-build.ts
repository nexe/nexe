import { writeFileSync, readFileSync } from 'fs'

/**
 * post build step to insert code files into code files. 
 * '{{replace:path/to/file}}' => "file contents"
 * And the package.json version.
 */
//inject('plugins/nexe-daemon/lib/index.js')
inject('lib/patches/third-party-main.js')
inject('lib/steps/shim.js')
inject('lib/options.js', JSON.stringify(require('../package.json').version))

function inject(filename: string, ...replacements: string[]) {
  let contents = readFileSync(filename, 'utf8')
  contents = contents.replace(/('{{(.*)}}')/g, (substring: string, ...matches: string[]) => {
    if (!matches || !matches[1]) {
      return substring
    }
    const [replace, file] = matches[1].split(':')
    if (replace !== 'replace') {
      return substring
    }
    console.log('Replacing: ', substring)
    return replacements[+file] ? replacements[+file] : JSON.stringify(readFileSync(file, 'utf8'))
  })
  writeFileSync(filename, contents)
  console.log(`Wrote: ${filename}`)
}
