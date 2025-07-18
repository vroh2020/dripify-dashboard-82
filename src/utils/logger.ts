
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static log(level: LogLevel, ...args: unknown[]) {
    if (isProduction) {
      // In production, only log errors
      if (level === 'error') {
        console.error(...args);
      }
      return;
    }

    switch (level) {
      case 'debug':
        console.debug(...args);
        break;
      case 'info':
        console.info(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
    }
  }

  static debug(...args: unknown[]) {
    this.log('debug', ...args);
  }

  static info(...args: unknown[]) {
    this.log('info', ...args);
  }

  static warn(...args: unknown[]) {
    this.log('warn', ...args);
  }

  static error(...args: unknown[]) {
    this.log('error', ...args);
  }
}

export default Logger;
