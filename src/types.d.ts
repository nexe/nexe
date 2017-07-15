declare module 'nigel' {
  import { Writable } from 'stream'
  interface Needle {
    value: Buffer
    lastPos: number
    last: number
    length: number
    badCharShift: Buffer
  }

  export function compile(needle: Buffer): Needle
  export function horspool(haystack: Buffer, needle: Needle, start: number): number
  export function all(haystack: Buffer, needle: Needle, pos: number): number[]
  export class Stream extends Writable {
    constructor(needle: Buffer)
    needle(needle: Buffer): void
    flush(): void
  }
}

declare module 'download' {
  import { Duplex } from 'stream'
  interface DownloadOptions {
    extract?: boolean
    strip?: number
    filename?: string
    proxy?: string
  }
  function download(
    url: string,
    destination?: string | DownloadOptions,
    options?: DownloadOptions
  ): PromiseLike<Buffer> & Duplex
  export = download
}
