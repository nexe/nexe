import { NexeTarget } from '../src/target'
import { writeFileAsync } from '../src/util'
import exec = require('execa')

function alpine (target: NexeTarget, nexeVersion: string) {
  const version = target.version
  return `
FROM i386/alpine:3.6
RUN apk add --no-cache curl make gcc g++ binutils-gold python linux-headers paxctl libgcc libstdc++ git vim tar gzip wget
WORKDIR /
RUN curl -sSL https://nodejs.org/dist/v${version}/node-v${version}.tar.gz | tar -xz && \
  cd /node-v${version} && \
  ./configure --prefix=/usr --fully-static && \
  make -j$(grep -c ^processor /proc/cpuinfo 2>/dev/null || 1) && \
  make install && \
  paxctl -cm /usr/bin/node

RUN mkdir nexe_temp && mv node-v${version} nexe_temp/${version}
RUN npm i nexe@beta -g
ENV NEXE_TEMP=/nexe_temp

RUN nexe --empty -c="--fully-static" -o /nexe-out`.trim()
}

export async function runAlpineBuild (target: NexeTarget, nexeVersion: string) {
  await writeFileAsync('Dockerfile', alpine(target, nexeVersion))
  const option = { stido: 'inherit' } as any
  await exec('docker', ['build', '-t', 'nexe-alpine', '.'], option)
  await exec('docker', ['run', '--name', 'nexe', 'nexe-alpine'], option)
  await exec('docker', ['cp', 'nexe:/nexe-out', 'out'], option)
  await exec('docker', ['rm', 'nexe'], option)
}
