# Nexe ChangeLog

## 2015-02-20, Version v0.3.7, @rainbowdashdc

### Noteable Changes

   * Fixed #103.
   * Made not-available require not a fatal error.
   * Stub and system to ignore certain requires.
   * Added 'sys' to ignore list.
   * We have a gitter!
   * Gave win32 a 100 length progress bar.

### Commits
  
   * [**2cacd83**] Update README.md (@crcn)
   * [**0e90ac9**] Update README.md (@crcn)
   * [**54967d1**] Added Gitter badge (@rainbowdashdc)
   * [**bb489a3**] Fixes #98 by giving win32 a 100 length progress bar. (@rainbowdashdc)
   * [**39665a8**] Lighter weight way to accomplish the exclusion of the sys module (@CKarper)
   * [**5aca22d**] This handles embedding 'bin' scripts with shebang interpreter... (@CKarper)
   * [**e79b0fb**] Stub to ignore require('sys') (@CKarper)

## 2015-02-15, Version v0.3.6, @rainbowdashdc

### Noteable Changes

   * Now support .json in require.
   * Fixed a major --python flag bug.

### Commits

   * [**cac6986**] V bump to solve critical error. (@rainbowdashdc)
   * [**b040337**] Fixes #99, resolves #97 by warning on missing file. New examples... (@rainbowdashdc)
   * [**ad4da1d**] Support .json extensions in require() resolution (@CKarper)

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
