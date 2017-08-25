import * as fs from 'fs'
import * as path from 'path'
import * as child from 'child_process'
import { createHash } from 'crypto'

export interface ExtractNodeModuleOptions {
  [key: string]:
    | {
        additionalFiles: string[]
      }
    | true
}

function hashName(name: string | Buffer) {
  return createHash('md5').update(name).digest('hex').toString().slice(0, 8)
}

export function embedDotNode(
  options: ExtractNodeModuleOptions,
  file: { contents: string; absPath: string }
) {
  const contents = fs.readFileSync(file.absPath)
  const module = Object.keys(options).find(x =>
    Boolean(~file.absPath.indexOf(path.join('node_modules', x)))
  )!
  const bindingName = path.basename(file.absPath)
  const settings = options[module]
  const moduleDir = hashName(contents)
  file.contents = `
  var fs=require('fs');var path=require('path');var binding='${contents.toString(
    'base64'
  )}';function mkdirp(r,t){t=t||null,r=path.resolve(r);try{fs.mkdirSync(r),t=t||r}catch(c){if("ENOENT"===c.code)t=mkdirp(path.dirname(r),t),mkdirp(r,t);else{var i;try{i=fs.statSync(r)}catch(r){throw c}if(!i.isDirectory())throw c}}return t};`

  if (settings === true) {
    file.contents += `
      mkdirp('${moduleDir}');
      var bindingPath = path.join(process.cwd(), '${moduleDir}', '${bindingName}')
      require('fs').writeFileSync(bindingPath, Buffer.from(binding, 'base64'))
      process.dlopen(module, bindingPath)
    `.trim()
    return
  }

  let depth = 0
  settings.additionalFiles.forEach(file => {
    let ownDepth = 0
    file.split('/').forEach(x => x === '..' && ownDepth++)
    depth = ownDepth > depth ? ownDepth : depth
  })
  let segments = [moduleDir]
  while (depth--) {
    segments.push(hashName(moduleDir + depth))
  }
  segments.push(bindingName)

  file.contents += `
    var cwd = process.cwd()
    var bindingFileParts = ${JSON.stringify(segments)};
    var bindingFile = path.join.apply(path, [cwd].concat(bindingFileParts));
    mkdirp(path.dirname(bindingFile));
    fs.writeFileSync(bindingFile, Buffer.from(binding, 'base64'));
    ${settings.additionalFiles.reduce((code, filename, i) => {
      const contents = fs.readFileSync(path.join(path.dirname(file.absPath), filename))
      return (code += `
        var file${i} = '${contents.toString('base64')}';
        var filePath${i} = path.join(cwd, bindingFileParts[0], '${filename.split('../').join('')}');
        mkdirp(path.dirname(filePath${i}));
        fs.writeFileSync(filePath${i}, Buffer.from(file${i}, 'base64'));
      `)
    }, '')};
    process.dlopen(module, bindingFile)
  `
}

function findNativeModulePath(filePath: string, bindingsArg: string) {
  const dirname = path.dirname(filePath)
  const tempFile = Math.random() * 100 + '.js'
  const tempFilePath = path.join(dirname, tempFile)
  fs.writeFileSync(
    tempFilePath,
    `
    var bindings = require('bindings');
    var Module = require('module');
    var originalRequire = Module.prototype.require;
    Module.prototype.require = function(path) {
      const mod = originalRequire.apply(this, arguments);
      process.stdout.write(path)
      return mod
    };
    bindings('${bindingsArg}')
  `
  )
  //using exec because it can be done sync
  const nativeFileName = child.execSync('node ' + tempFile, { cwd: dirname }).toString()
  fs.unlinkSync(tempFilePath)
  const relativePath = './' + path.relative(dirname, nativeFileName).replace(/\\/g, '/')
  return relativePath
}
/**
 * Traverse all nodes in a file and evaluate usages of the bindings module
 * handles two common cases
 */
export class BindingsRewrite {
  private bindingsIdNodes: any[] = []
  public nativeModulePaths: string[] = []
  public rewrite = false

  isRequireBindings(node: any) {
    return node.callee.name === 'require' && node.arguments[0].value === 'bindings'
  }

  onNode(absolutePath: string, node: any, parent: any) {
    if (node.type === 'CallExpression') {
      if (this.isRequireBindings(node) && parent.type === 'VariableDeclarator') {
        /**
         * const loadBindings = require('bindings');
         *   -> const loadBindings = String('');
         */
        this.bindingsIdNodes.push(parent.id)
        node.callee.name = 'String'
        node.arguments[0].value = ''
        this.rewrite = true
        return
      }

      if (this.isRequireBindings(node) && parent.type === 'CallExpression') {
        /**
         *const bindings = require('bindings')('native-module')....
         *  -> const bindings = require('./path/to/native/module.node').....
         */
        const bindingsArgNode = parent.arguments[0]
        if (bindingsArgNode.type === 'Literal') {
          parent.callee = { type: 'Identifier', name: 'require' }
          bindingsArgNode.value = findNativeModulePath(absolutePath, bindingsArgNode.value)
          this.nativeModulePaths.push(bindingsArgNode.value)
          this.rewrite = true
          return
        }
      }

      const bindingsInvocationIdx = this.bindingsIdNodes.findIndex(x => node.callee.name === x.name)

      if (this.bindingsIdNodes[bindingsInvocationIdx]) {
        /**
         * const bindings = loadBindings('native-module')
         *   -> const bindings = require('./path/to/native/module.node')
         */
        const bindingsIdNode = this.bindingsIdNodes[bindingsInvocationIdx]
        const bindingsArgNode = node.arguments[0]
        this.bindingsIdNodes.splice(bindingsInvocationIdx, 1)

        if (bindingsArgNode.type === 'Literal') {
          node.callee.name = 'require'
          bindingsArgNode.value = findNativeModulePath(absolutePath, bindingsArgNode.value)
          this.nativeModulePaths.push(bindingsArgNode.value)
          this.rewrite = true
          return
        }
      }
    }
  }
}
