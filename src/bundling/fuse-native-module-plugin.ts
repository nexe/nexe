import { BindingsRewrite, embedDotNode, ExtractNodeModuleOptions } from './bindings-rewrite'

export interface FuseBoxFile {
  info: { absPath: string }
  absPath: string
  contents: string
  analysis: {
    dependencies: string[]
    requiresRegeneration: boolean
  }
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

export default function(options: ExtractNodeModuleOptions) {
  return new NativeModulePlugin(options)
}

export class NativeModulePlugin {
  public test: RegExp
  public limit2Project = false
  private modules: (keyof ExtractNodeModuleOptions)[]

  constructor(public options: ExtractNodeModuleOptions) {
    this.options = options
    this.test = new RegExp(`node_modules\/(${Object.keys(options).join('|')}).*\.js|\.node$`)
  }

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
