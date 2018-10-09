if (true) {
  const __nexe_patches = (process.nexe = { patches: {} }).patches
  const slice = [].slice
  const __nexe_noop_patch = function (original) {
    const args = slice.call(arguments, 1)
    return original.apply(this, args)
  }
  const __nexe_patch = function (obj, method, patch) {
    const original = obj[method]
    if (!original) return
    __nexe_patches[method] = patch
    obj[method] = function() {
      const args = [original].concat(slice.call(arguments))
      return __nexe_patches[method].apply(this, args)
    }
  }
  __nexe_patch((process).binding('fs'), 'internalModuleReadFile', __nexe_noop_patch)
  __nexe_patch((process).binding('fs'), 'internalModuleReadJSON', __nexe_noop_patch)
  __nexe_patch((process).binding('fs'), 'internalModuleStat', __nexe_noop_patch)
}
