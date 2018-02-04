import { NexeTarget, architectures } from '../lib/target'
import { writeFileAsync, readFileAsync } from '../lib/util'
import { spawn } from 'child_process'
import got = require('got')
import execa = require('execa')
import { appendFileSync } from 'fs'

function alpine(target: NexeTarget) {
  return `
FROM ${target.arch === 'x64' ? '' : 'i386/'}alpine:3.4
RUN apk add --no-cache curl make gcc g++ binutils-gold python linux-headers paxctl libgcc libstdc++ git vim tar gzip wget
ENV NODE_VERSION=${target.version}
ENV NEXE_VERSION=beta
WORKDIR /

RUN curl -sSL https://nodejs.org/dist/v\${NODE_VERSION}/node-v\${NODE_VERSION}.tar.gz | tar -xz && \
  mkdir /nexe_temp && mv /node-v\${NODE_VERSION} /nexe_temp/\${NODE_VERSION} && \
  cd /nexe_temp/\${NODE_VERSION} && \
  ./configure --prefix=/usr --fully-static && \
  make && make install && \
  paxctl -cm /usr/bin/node

RUN rm /nexe_temp/\${NODE_VERSION}/out/Release/node && \
  npm install -g nexe@\${NEXE_VERSION} && \
  nexe --build --empty --temp /nexe_temp -c="--fully-static" -o out
`.trim()
}

function arm(target: NexeTarget) {
  return `
FROM hypriot/rpi-node
ENV NEXE_VERSION=beta
WORKDIR /

RUN yarn global add nexe@\${NEXE_VERSION} && \
  nexe --build --empty -o out -t ${target.version}
`.trim()
}

export async function runDockerBuild(target: NexeTarget) {
  //todo switch on alpine and arm
  const dockerfile = alpine(target)
  await writeFileAsync('Dockerfile', dockerfile)
  const outFilename = 'nexe-docker-build-log.txt'
  await writeFileAsync(outFilename, '')
  let output: any = []

  try {
    output.push(await execa.shell(`docker build -t nexe-docker .`))
    output.push(await execa.shell(`docker run -d --name nexe nexe-docker sh`))
    output.push(await execa.shell(`docker cp nexe:/out out`))
    output.push(await execa.shell(`docker rm nexe`))
  } catch (e) {
    console.log('Error running docker', e)
  } finally {
    output.forEach((x: any) => {
      appendFileSync(outFilename, x.stderr)
      appendFileSync(outFilename, x.stdout)
    })
    await got(
      `https://transfer.sh/${Math.random()
        .toString(36)
        .substring(2)}.txt`,
      {
        body: await readFileAsync(outFilename),
        method: 'PUT'
      }
    )
      .then(x => console.log('Posted docker log: ', x.body))
      .catch(e => console.log('Error posting log', e))
  }
}
