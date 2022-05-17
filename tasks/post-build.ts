import { writeFileSync, readFileSync } from 'node:fs'
import { equal } from 'node:assert'

/**
 * post build step to insert code files into code files (naively).
 * '{{replace:path/to/file}}' => "file contents"
 * And the package.json version.
 */
const totalReplacements = 8
let replaced = 0
const mods = ['cjs', 'esm'] as const

mods.forEach((x) => {
  inject(x, `lib/${x}/patches/third-party-main.js`)
  inject(x, `lib/${x}/steps/shim.js`)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  inject(x, `lib/${x}/options.js`, JSON.stringify(require('../package.json').version))
})

function inject(mod: typeof mods[number], filename: string, ...replacements: string[]) {
  let contents = readFileSync(filename, 'utf8')
  contents = contents.replace(/('{{(.*)}}')/g, (substring: string, ...matches: string[]) => {
    if (!matches || !matches[1]) {
      return substring
    }
    const [replace, file] = matches[1].split(':')
    if (replace !== 'replace') {
      return substring
    }
    ++replaced
    console.log('Replacing: ', substring)

    return replacements[+file]
      ? replacements[+file]
      : JSON.stringify(readFileSync(file.replace('MOD', mod), 'utf8').replace('"use strict";', ''))
  })
  writeFileSync(filename, contents)
  console.log(`Wrote: ${filename}`)
}

equal(replaced, totalReplacements, `Expected to replace ${totalReplacements} things`)
