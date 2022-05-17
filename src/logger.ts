import { Func, color, esm } from './util'

const frameLength = 120

export interface LogStep {
  modify: (text: string, color?: string) => void
  log: (text: string, color?: string) => void
  pause: () => void
  resume: () => void
}

export class Logger {
  public verbose: boolean
  private readonly silent: boolean
  private ora: any
  private readonly modify: Func
  public write: (text: string, color?: string) => void

  constructor(level: 'verbose' | 'silent' | 'info') {
    this.verbose = level === 'verbose'
    this.silent = level === 'silent'
    if (!this.silent) {
      this.ora = esm.ora?.default({
        text: 'Starting...',
        color: 'blue',
        spinner: 'dots',
      })
      this.ora.stop()
    }
    const noop = () => void 0
    this.modify = this.silent ? noop : this._modify.bind(this)
    this.write = this.silent ? noop : this._write.bind(this)
  }

  async flush() {
    !this.silent && this.ora.succeed()
    return await new Promise((resolve) => setTimeout(resolve, frameLength))
  }

  _write(update: string, clr = 'green') {
    this.ora.succeed().text = color(clr, update)
    this.ora.start()
  }

  _modify(update: string, color = this.ora.color) {
    this.ora.text = update
    this.ora.color = color
  }

  step(text: string, method = 'succeed', clr?: string): LogStep {
    if (this.silent) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return { modify() {}, log() {}, pause() {}, resume() {} }
    }
    text = color(clr, text)
    if (!this.ora.id) {
      this.ora.start().text = text
      if (method !== 'succeed') {
        this.ora[method]()
      }
    } else {
      this.ora[method]().text = text
      this.ora.start()
    }

    return {
      modify: this.modify,
      log: this.verbose ? this.write : this.modify,
      pause: () => this.ora.stopAndPersist(),
      resume: () => this.ora.start(),
    } as LogStep
  }
}
