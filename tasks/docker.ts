import { NexeTarget } from '../lib/target'
import { writeFileAsync, readFileAsync } from '../lib/util'
import { spawn } from 'child_process'
import got = require('got')
import { createWriteStream, WriteStream } from 'fs'

function alpine (target: NexeTarget, nexeVersion: string) {  
  return `
FROM i386/alpine:3.4
RUN apk add --no-cache curl make gcc g++ binutils-gold python linux-headers paxctl libgcc libstdc++ git vim tar gzip wget
ENV NODE_VERSION=${target.version}
ENV NEXE_VERSION=beta
WORKDIR /

RUN curl -sSL https://nodejs.org/dist/v\${NODE_VERSION}/node-v\${NODE_VERSION}.tar.gz | tar -xz && \
  cd /node-v\${NODE_VERSION} && \
  ./configure --prefix=/usr --fully-static && \
  make -j$(getconf _NPROCESSORS_ONLN) && \
  make install && \
  paxctl -cm /usr/bin/node

RUN mkdir /nexe_temp && mv node-v\${NODE_VERSION} /nexe_temp/\${NODE_VERSION} && \
  npm install -g nexe@\${NEXE_VERSION} && \
  nexe --build --empty --temp /nexe_temp -c="--fully-static" -o out
`.trim()
}

export async function runAsync (command: string, output: WriteStream) {
  const commands = command.split(/\r?\n/)
    .filter(x => x.trim())
    .map(x => x.trim().split(' '))
  const sequence = Promise.resolve()
  for (const command of commands) {
    await new Promise((resolve, reject) => {
      const cp = spawn(command.shift() as string, command)
      cp.stderr.pipe(output)
      cp.stdout.pipe(output)
      const close = function (this: any, e: Error) {
        this.kill()
        e ? reject(e) : resolve()
      }
      cp.on('error', (e) => {
        output.write(e.stack)
      })
      .on('close', close)
      .on('exit', close)
    })
  }
}

export async function runAlpineBuild (target: NexeTarget, nexeVersion: string) {
  await writeFileAsync('Dockerfile', alpine(target, nexeVersion))
  const outFilename = 'nexe-alpine-build-log.txt'
  const output = createWriteStream(outFilename)
  try {
    await runAsync(`
    docker build -t nexe-alpine .
    docker run -d --name nexe nexe-alpine sh
    docker cp nexe:/out out
    docker rm nexe
  `, output)
  } catch(e) {
    console.log(e)
  } finally {
    output.on('error', (e) => console.log(e))
    output.close()
    await got(`https://transfer.sh/${Math.random().toString(36).substring(2)}.txt`, {
      body: await readFileAsync(outFilename),
      method: 'PUT'
    })
    .then(x => console.log(x.body))
    .catch(e => console.log('Error posting log', e))
  }
}
