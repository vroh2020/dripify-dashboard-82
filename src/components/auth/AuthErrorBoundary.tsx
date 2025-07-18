
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorBoundaryManager } from '@/utils/errorBoundary';
import Logger from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use the error boundary manager
    errorBoundaryManager.handleError(error, errorInfo);
    
    // Also log to our logger
    Logger.error('Auth Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href
    });

    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    try {
      // Clear any problematic state
      localStorage.removeItem('dripify_onboarding_progress');
      sessionStorage.clear();
      
      // Reset error boundary
      errorBoundaryManager.resetErrorCount();
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      
      // Force a clean reload
      window.location.reload();
    } catch (retryError) {
      Logger.error('Failed to retry after error:', retryError);
      window.location.href = '/auth';
    }
  };

  private handleGoToAuth = () => {
    try {
      // Clear all state
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset error boundary
      errorBoundaryManager.resetErrorCount();
      
      // Navigate to auth
      window.location.href = '/auth';
    } catch (navError) {
      Logger.error('Failed to navigate to auth:', navError);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col justify-center items-center p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Oops! Something went wrong</h2>
              <p className="text-gray-400">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-900/50 rounded-lg p-4 text-sm">
                <summary className="cursor-pointer text-gray-300 mb-2">Error Details</summary>
                <div className="space-y-2 text-gray-400">
                  <div>
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs overflow-auto">{this.state.error.stack}</pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs overflow-auto">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoToAuth}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>

            {/* Debug Info */}
            <div className="text-xs text-gray-500 pt-4 border-t border-gray-800">
              <p>URL: {window.location.href}</p>
              <p>Time: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
