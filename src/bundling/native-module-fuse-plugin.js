import { BindingsRewrite } from './bindings-rewrite'

export class NativeModulePlugin {
  constructor (...moduleNames) {
    this.test = new RegExp(`node_modules\/(${moduleNames.join('|')}).*\.js`)
    this.limit2project = false
  }

  transform (file) {
    const bindingsRewrite = new BindingsRewrite()
    file.loadContents()
    file.makeAnalysis(null, {
      plugins: [{
        onNode(file, node, parent) {
          bindingsRewrite.onNode(file.info.absPath, node, parent)
        },
        onEnd(file) {
          if (bindingsRewrite.rewrite) {
            const index = file.analysis.dependencies.indexOf('bindings')
            if (~index) {
              file.analysis.dependencies.splice(index, 1)
            }
            file.analysis.dependencies.push(...bindingsRewrite.nativeModulePaths)
            file.analysis.requiresRegeneration = true
          }
        }
      }]
    })
  }
}
