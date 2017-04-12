import gyp from './gyp'
import content from './content'
import main from './third-party-main'
import cli from './disable-node-cli'
import flags from './flags'
import ico from './ico'
import rc from './node-rc'

const patches = [
  gyp,
  content,
  main,
  cli,
  flags,
  ico,
  rc
]

export default patches
