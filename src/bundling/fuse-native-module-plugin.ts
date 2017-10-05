import { BindingsRewrite } from './bindings-rewrite'
import { embedDotNode, EmbedNodeModuleOptions } from './embed-node'

export interface FuseBoxFile {
  info: { absPath: string }
  absPath: string
  contents: string
  analysis: {
    dependencies: string[]
    requiresRegeneration: boolean
  }
  consume(): void
  loadContents(): void
  makeAnalysis(
    parsingOptions?: any,
    traversalPlugin?: {
      plugins: Array<{
        onNode(file: FuseBoxFile, node: any, parent: any): void
        onEnd(file: FuseBoxFile): void
      }>
    }
  ): void
}

export default function(options: EmbedNodeModuleOptions = {}) {
  return new NativeModulePlugin(options)
}

export class NativeModulePlugin {
  public test = /node_modules.*(\.js|\.node)$|\.node$/
  public limit2Project = false
  private modules: (keyof EmbedNodeModuleOptions)[]

  constructor(public options = {}) {}

  init(context: any) {
    context.allowExtension('.node')
  }

  transform(file: FuseBoxFile) {
    file.loadContents()

    if (file.absPath.endsWith('.node')) {
      embedDotNode(this.options, file)
      return
    }

    const bindingsRewrite = new BindingsRewrite()

    file.makeAnalysis(null, {
      plugins: [
        {
          onNode(file, node, parent) {
            bindingsRewrite.onNode(file.absPath, node, parent)
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
        }
      ]
    })
  }
}
