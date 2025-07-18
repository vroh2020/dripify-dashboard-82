import Logger from './logger';

export interface ErrorInfo {
  componentStack: string;
  error: Error;
  timestamp: number;
  url: string;
  userAgent: string;
}

export class ErrorBoundaryManager {
  private static instance: ErrorBoundaryManager;
  private errorCount = 0;
  private maxErrors = 5;
  private errorWindow = 60000; // 1 minute
  private lastErrorTime = 0;

  private constructor() {}

  static getInstance(): ErrorBoundaryManager {
    if (!ErrorBoundaryManager.instance) {
      ErrorBoundaryManager.instance = new ErrorBoundaryManager();
    }
    return ErrorBoundaryManager.instance;
  }

  handleError(error: Error, errorInfo?: { componentStack?: string }): void {
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;

    const errorData: ErrorInfo = {
      componentStack: errorInfo?.componentStack || '',
      error,
      timestamp: now,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };

    Logger.error('React Error Boundary caught error:', errorData);

    // If too many errors in short time, force reload
    if (this.errorCount >= this.maxErrors) {
      Logger.warn('Too many errors detected, forcing page reload');
      this.forceReload();
      return;
    }

    // Log to console for debugging
    console.error('🚨 Error Boundary caught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors
    });
  }

  private forceReload(): void {
    try {
      // Clear any problematic state
      localStorage.removeItem('dripify_onboarding_progress');
      sessionStorage.clear();
      
      // Force reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (reloadError) {
      Logger.error('Failed to force reload:', reloadError);
    }
  }

  resetErrorCount(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
}

export const errorBoundaryManager = ErrorBoundaryManager.getInstance();