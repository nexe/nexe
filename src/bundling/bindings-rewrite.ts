import * as fs from 'fs'
import * as path from 'path'
import * as child from 'child_process'
import { createHash } from 'crypto'

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

  isRequire(node: any, moduleName: string) {
    return node.callee.name === 'require' && node.arguments[0].value === moduleName
  }

  onNode(absolutePath: string, node: any, parent: any) {
    if (node.type === 'CallExpression') {
      if (this.isRequire(node, 'bindings') && parent.type === 'VariableDeclarator') {
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

      if (this.isRequire(node, 'bindings') && parent.type === 'CallExpression') {
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
