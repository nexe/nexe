import { BindingsRewrite } from './bindings-rewrite'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { dirname, join, basename } from 'path'

function hashName(name: string | Buffer) {
  return createHash('md5').update(name).digest('hex').toString().slice(0, 8)
}

export interface FuseBoxFile {
  info: { absPath: string }
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

export interface NativeModulePluginOptions {
  [key: string]:
    | {
        additionalFiles: string[]
      }
    | true
}

export default function(options: NativeModulePluginOptions) {
  return new NativeModulePlugin(options)
}

export class NativeModulePlugin {
  public test: RegExp
  public limit2Project = false
  private modules: (keyof NativeModulePluginOptions)[]

  constructor(public options: NativeModulePluginOptions) {
    this.modules = Object.keys(options)
    this.test = new RegExp(`node_modules\/(${Object.keys(options).join('|')}).*\.js|\.node$`)
  }

  init(context: any) {
    context.allowExtension('.node')
  }

  transform(file: FuseBoxFile) {
    file.loadContents()

    if (file.info.absPath.endsWith('.node')) {
      const contents = readFileSync(file.info.absPath)
      const module = this.modules.find(x =>
        Boolean(~file.info.absPath.indexOf(join('node_modules', x)))
      )!
      const bindingName = basename(file.info.absPath)
      const settings = this.options[module]
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
          const contents = readFileSync(join(dirname(file.info.absPath), filename))
          return (code += `
            var file${i} = '${contents.toString('base64')}';
            var filePath${i} = path.join(cwd, bindingFileParts[0], '${filename
            .split('../')
            .join('')}');
            mkdirp(path.dirname(filePath${i}));
            fs.writeFileSync(filePath${i}, Buffer.from(file${i}, 'base64'));
          `)
        }, '')};
        process.dlopen(module, bindingFile)
      `
      return
    }

    const bindingsRewrite = new BindingsRewrite()
    file.makeAnalysis(null, {
      plugins: [
        {
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
        }
      ]
    })
  }
}
