# Nexe ChangeLog

## 2015-02-14, Version v0.3.5, @rainbowdashdc


### Noteable Changes

   * Added new flag: `--python </path/to/python>`
   * Added resourceFiles option which allows embedding files and getting them via embed.js
   * Updated a bunch of the dependencies.
   * `process.argv` is now consistent in a child fork case.
   * Added `child_process.fork` support.
   * Added new collaborators:
      * Jared Allard (@rainbowdashdc)

### Commits

  * [**e4155c8**] Version bump 0.3.5, update depends (@RainbowDashDC)
  * [**e91f5b5**] Add example, fix outdated examples (@RainbowDashDC)
  * [**3b1d5a9**] Modify README, implement cross-plat `--python <loc>` closes #94 (@RainbowDashDC)
  * [**29d5f6a**] Make `process.argv` consistent in the child fork case (@LorenzGardner)
  * [**97dbd37**] Add support for embedded files. (@LorenzGardner)
  * [**b615e12**] Make the example code demonstrate forked process and dynamic require (@LorenzGardner)
  * [**333cc69**] update read me mentioning usage of `child_process.fork` (@LorenzGardner)
  * [**ece4b2d**] Add `child_process.fork` support. (@LorenzGardner)
