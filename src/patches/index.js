module.exports.patches = [
  require('./gyp').nodeGyp, //upstream, sets manifest
  require('./content').content, //upstream, sets main module content
  require('./third-party-main').main, //loads main module
  require('./disable-node-cli').disableNodeCli,
  require('./flags').flags,
  require('./ico').ico,
  require('./node-rc').nodeRc
]
