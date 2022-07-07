import * as nexeEsm from '../lib/esm/nexe.js'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { ok } from 'node:assert'

const cjs = createRequire(fileURLToPath(import.meta.url)),
  nexeCjs = cjs('../lib/cjs/nexe.js'),
  exports = ['NexeCompiler', 'argv', 'compile', 'help', 'version']

for (const exp of exports) {
  ok(exp in nexeCjs)
  ok(exp in nexeEsm)
}

console.log('esm and cjs modules match')
