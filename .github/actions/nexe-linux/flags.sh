#!/bin/bash
ARCH=$(uname -m)

case $ARCH in
  "x86_64")
    CONFIGURE_FLAGS="--dest-cpu=x64"
  ;;
  "aarch64")
  ;&
  "armv7l")
    CONFIGURE_FLAGS="--openssl-no-asm --dest-cpu=arm --with-arm-float-abi=hard"
  ;;
  *)
    CONFIGURE_FLAGS=""
  ;;
esac

MAKE_FLAGS="-j$(getconf _NPROCESSORS_ONLN)"
