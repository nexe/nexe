import * as wcp from 'webpack-config-prefabs';
export = wcp.nodeLibrary(module, {
  enableTypescript: true,
  entry: './src/fs/patch.ts',
  minimize: false,
  outputFilepath: './lib/fs/patch.bundle.js',
});
