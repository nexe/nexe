import {
  FuseBox,
  CSSPlugin,
  JSONPlugin,
  HTMLPlugin } from 'fuse-box'
import { fromCallback } from 'bluebird'
import * as path from 'path'

export default async function bundle (compiler, next) {
  let options = compiler.options.bundle
  if (!options) {
    return next()
  }

}
