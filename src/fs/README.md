# nexe-fs

This module contains a set of patches used to create (and use) the nexe virtual filesystem

---

### Getting Started:

To patch the module loader, monkey patches must be installed on a few methods at the time that node boots up. This requires a special build of node. Nexe provides these builds or the patch can be applied from this module manually in your own build setup.

```javascript
const bootstrapPatch = fs.readFileSync(require.resolve('nexe-fs/bootstrap'), 'utf-8')
// insert boostrapPatch wherever node starts up. For reference, Nexe does this
// in third-party-main.ts
```

To create a virtual file system use the `Bundle` Object

```javascript
const { Bundle } = require('nexe-fs')

const bundle = new Bundle({ cwd })
await bundle.addResource(absoluteFileName)

bundle.toStream().pipe(fs.createWriteStream('./myFsBlob'))

// You'll also want to save the bundle index to use at runtime
// It can be saved by accessing bundle.index (object/hash) or serializing the bundle with JSON.stringify(bundle)
```

In the entrypoint of the custom node build, the fs patch needs to be applied
```javascript
const fakeFs = fs.readFileSync(require.resolve('nexe-fs/patch'), 'utf-8')
//apply this code to your entrypoint
```

The patch exposes two methods, `shimFs` and `restoreFs` to be used as follows:

```javascript
shimFs({
  blobPath: 'location/of/myFsBlob',
  resources: bundle.index,
  layout: {
    stat: blobStats //fs.Stats object about the blob at blobPath
    resourceStart: 0 // the offset within the blob that is referenced by the bundle index
  }
})
```

At this point executing the original entrypoint shoudl result in usage of the virtual filesystem.



