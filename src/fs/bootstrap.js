const __nexe_patches = (process.nexe = { patches: {} }).patches
function __nexe_noop_patch(original, ...args) {
  return original.call(this, ...args)
}
function __nexe_patch(obj, method, patch) {
  const original = obj[method]
  if (!original) return
  __nexe_patches[method] = patch
  obj[method] = function( ...args) {
    return __nexe_patches[method].call(this, original, ...args)
  }
}
__nexe_patch((process).binding('fs'), 'internalModuleReadFile', __nexe_noop_patch)
__nexe_patch((process).binding('fs'), 'internalModuleReadJSON', __nexe_noop_patch)
__nexe_patch((process).binding('fs'), 'internalModuleStat', __nexe_noop_patch)
