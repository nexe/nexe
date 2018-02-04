//add placeholder patches so methods can be monkeypatched after being dereferenced
const __nexe_patches = ((process as any).nexe = { patches: {} }).patches as any

function __nexe_noop_patch(this: any, original: any, ...args: any[]) {
  return original.call(this, ...args)
}

function __nexe_patch(obj: any, method: string, patch: any) {
  __nexe_patches[method] = patch
  const original = obj[method]
  obj[method] = function(this: any, ...args: any[]) {
    return __nexe_patches[method].call(this, original, ...args)
  }
}

__nexe_patch((process as any).binding('fs'), 'internalModuleReadFile', __nexe_noop_patch)
__nexe_patch((process as any).binding('fs'), 'internalModuleStat', __nexe_noop_patch)
