# nexe-fs

### Getting Started:

This module contains a set of patches used to create (and use) the Nexe Virtual FileSystem

In order for NVFS to work with node's `require` method. A custom build of node must be used. If using the `nexe` cli this will be handled automatically

The customization should be applied as early as possbile when node is starting up. 

i.e. The contents of `nexe-fs/bootstrap` should be put [here](https://github.com/nodejs/node/blob/0827c80920311fa9d1e6989c8a73aaaeca962eb7/lib/internal/bootstrap/node.js#L27-L28).

### Creating a NVFS:

To create a virtual file system use the `Bundle` Object, in your build process:

```javascript
const { Bundle } = require('nexe-fs')

const bundle = new Bundle()
await bundle.addResource(absoluteFileName)

bundle.toStream().pipe(fs.createWriteStream('./myFsBlob'))
```

In the entrypoint of your application, the fs patch needs to be applied (executed as early as possible)
For example, In the build process, the application's entrypoint could be prepended with the following:

```javascript
const codeToPrependToEntrypoint = fs.readFileSync(require.resolve('nexe-fs/patch'), 'utf-8') + `
shimFs({
  blobPath: 'location/of/myFsBlob',
  resources: ${JSON.stringify(bundle)},
  layout: {
    resourceStart: 0 // the offset within the blob that is referenced by the bundle index
  }
})`
```

Since a custom node build is being used. A great place for this code would be the node source file: `_third_party_main.js`
