## Changes in v2.0.0

This is a loose written changelog of v2.0.0 changes (so far!)

## Modules.

In an effort to reduce clatter and overall file size, I've made a system of
loading "modules" and instancing them.

Every file in ./lib is loaded into nexe.libs. Each module is instanced with two
objects (accessible via constructor), `(libs, config)`.

`libs` - access to the nexe.libs object, to allow modules to interact with one
another.

`config` - config object that nexe was instanced with.

### Log

This is the log object for nexe. Accessible via libs.log

It provides `1` method:

`log.log` - log output to the console.
