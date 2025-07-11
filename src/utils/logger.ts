
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

export class Logger {
  static info(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  static error(message: string, ...args: any[]) {
    // Always log errors, even in production
    console.error(`❌ ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`🐛 ${message}`, ...args);
    }
  }

  static performance(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`⏱️ ${message}`, ...args);
    }
  }

  static success(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  // Production-safe critical logging
  static critical(message: string, ...args: any[]) {
    console.error(`🚨 CRITICAL: ${message}`, ...args);
  }
}
