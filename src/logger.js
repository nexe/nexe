import colors from 'chalk'
import ora from 'ora'

const frameLength = 120

export class Logger {
  constructor (level) {
    this.verbose = level === 'verbose'
    this.silent = level === 'silent'
    if (!this.silent) {
      this.ora = ora('Starting...', {
        color: 'blue',
        spinner: 'dots'
      })
      this.ora.stop()
    }
    const noop = () => {}
    this.modify = this.slient ? noop : this._modify.bind(this)
    this.write = this.silent ? noop : this._write.bind(this)
  }

  flush () {
    !this.silent && this.ora.succeed()
    return new Promise(resolve => setTimeout(resolve, frameLength))
  }

  _write (update, color = 'green') {
    this.ora.succeed().text = colors[color](update)
    this.ora.start()
  }

  _modify (update, color = this.ora.color) {
    this.ora.text = update
    this.ora.color = color
  }

  step (text) {
    if (this.silent) {
      return { modify () {}, log () {} }
    }
    if (!this.ora.id) {
      this.ora.start().text = text
    } else {
      this.ora.succeed().text = text
      this.ora.start()
    }

    return {
      modify: this.modify,
      log: this.verbose ? this.write : this.modify
    }
  }
}
