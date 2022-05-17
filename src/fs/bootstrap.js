if (true) {
  const patches = (process.nexe = { patches: {} }).patches

  ;["ReadFile", "ReadJSON", "Stat"].forEach((x) => {
    patch(process.binding("fs"), "internalModule" + x, noop)
  })

  function noop(original, ...args) {
    return original.apply(this, args)
  }

  function patch(obj, method, patch) {
    const original = obj[method];
    if (!original) return
    patches[method] = patch
    obj[method] = function (...args) {
      args.unshift(original)
      return patches[method].apply(this, args)
    }
  }
}
