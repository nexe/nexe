const __nexe_patches = ((process as any).nexe = { patches: {} }).patches as any
function __nexe_noop_patch(this: any, original: any, ...args: any[]) {
  return original.call(this, ...args)
}
function __nexe_patch(obj: any, method: string, patch: any) {
  const original = obj[method]
  if (!original) return
  __nexe_patches[method] = patch
  obj[method] = function(this: any, ...args: any[]) {
    return __nexe_patches[method].call(this, original, ...args)
  }
}
__nexe_patch((process as any).binding('fs'), 'internalModuleReadFile', __nexe_noop_patch)
__nexe_patch((process as any).binding('fs'), 'internalModuleReadJSON', __nexe_noop_patch)
__nexe_patch((process as any).binding('fs'), 'internalModuleStat', __nexe_noop_patch)
