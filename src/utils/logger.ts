
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static log(level: LogLevel, ...args: any[]) {
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

  static debug(...args: any[]) {
    this.log('debug', ...args);
  }

  static info(...args: any[]) {
    this.log('info', ...args);
  }

  static warn(...args: any[]) {
    this.log('warn', ...args);
  }

  static error(...args: any[]) {
    this.log('error', ...args);
  }
}

export default Logger;
