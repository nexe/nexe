function* nodeRc (compiler, next) {
  const options = compiler.options.rc
  if (!options) {
    return next()
  }

  const file = yield compiler.readFileAsync('src/res/node.rc')

  Object.keys(options).forEach((key) => {
    const value = options[key],
      isVar = /^[A-Z_]+$/.test(value)

    value = isVar ? value : `"${value}"`
    file.contents.replace(new RegExp(`VALUE "${key}",*`), `VALUE "${key}", ${value}`)
    // TODO support keys that are not present?
  })

  return next()
}

module.exports.nodeRc = nodeRc
