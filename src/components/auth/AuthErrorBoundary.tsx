
import React, { Component, ReactNode } from 'react';
import { Logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return { 
      hasError: true, 
      error,
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    Logger.critical('Error Boundary Caught Error:', error.message);
    console.error('Full error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  private reportErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Placeholder for error reporting service integration
    try {
      // Could integrate with Sentry, LogRocket, etc.
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorId: this.state.errorId
      };
      
      // For now, just log to console in production
      console.error('🚨 Production Error Report:', errorReport);
    } catch (reportingError) {
      Logger.error('Failed to report error to service:', reportingError);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">😞</div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-white/70 mb-6 leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-white/60 text-sm cursor-pointer mb-2">
                  Error Details (Dev Mode)
                </summary>
                <div className="bg-red-900/20 p-3 rounded-lg text-red-300 text-xs font-mono">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorId && (
                    <div className="mb-2">
                      <strong>ID:</strong> {this.state.errorId}
                    </div>
                  )}
                  <div className="max-h-32 overflow-y-auto">
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </div>
              </details>
            )}
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 rounded-xl transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all duration-200 border border-white/20"
              >
                Reload App
              </button>
            </div>
            
            {this.state.errorId && (
              <p className="text-white/40 text-xs mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
