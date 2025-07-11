import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { performanceMonitor } from './utils/performance-monitor.ts'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import React from 'react'
import { Logger } from './utils/logger'

// Extend Window interface for our performance tracking
declare global {
  interface Window {
    APP_PERFORMANCE?: {
      startTime: number;
      metrics: Record<string, number>;
      mark: (label: string) => void;
    };
  }
}

// Enhanced Splash Manager with iOS Optimizations
class SplashManager {
  private splashElement: HTMLElement | null;
  private appShellElement: HTMLElement | null;
  private progressFill: HTMLElement | null;
  private loadingMessage: HTMLElement | null;
  private minimumDisplayTime: number;
  private splashStartTime: number;
  private currentProgress: number;
  private isCapacitor: boolean;
  private timeouts: number[] = []; // Track timeouts for cleanup

  constructor() {
    this.splashElement = document.getElementById('html-splash');
    this.appShellElement = document.getElementById('app-shell');
    this.progressFill = document.getElementById('progress-fill');
    this.loadingMessage = document.getElementById('loading-message');
    this.minimumDisplayTime = import.meta.env.PROD ? 1500 : 2500; // Faster in production
    this.splashStartTime = Date.now();
    this.currentProgress = 0;
    this.isCapacitor = Capacitor.isNativePlatform();

    // Start tracking splash display time
    performanceMonitor.startTiming('splash-display');

    // Initialize Capacitor splash screen if on native platform
    if (this.isCapacitor) {
      this.initializeCapacitorSplash();
    }
  }

  private async initializeCapacitorSplash(): Promise<void> {
    try {
      Logger.info('Initializing Capacitor splash screen for iOS');
      
      // Ensure splash stays visible with proper configuration
      await SplashScreen.show({
        autoHide: false,
        fadeInDuration: 0,
        fadeOutDuration: 500
      });
      
      Logger.success('Capacitor splash screen secured with enhanced config');
    } catch (error) {
      Logger.warn('Capacitor splash screen initialization failed:', error);
    }
  }

  updateProgress(progress: number, message?: string) {
    this.currentProgress = Math.max(this.currentProgress, progress);
    
    if (this.progressFill) {
      (this.progressFill as HTMLElement).style.width = `${this.currentProgress}%`;
    }
    
    if (this.loadingMessage && message) {
      this.loadingMessage.textContent = message;
    }

    // Mark performance milestone
    performanceMonitor.mark(`progress-${progress}`);
    if (window.APP_PERFORMANCE) {
      window.APP_PERFORMANCE.mark(`progress-${progress}-${message?.replace(/\s+/g, '-')}`);
    }
  }

  async hideWhenReady(): Promise<void> {
    // Ensure minimum display time for premium iOS feel
    const elapsed = Date.now() - this.splashStartTime;
    const remainingTime = Math.max(0, this.minimumDisplayTime - elapsed);
    
    if (remainingTime > 0) {
      this.updateProgress(90, 'Finalizing...');
      Logger.performance(`Maintaining splash for ${remainingTime}ms more for iOS UX`);
      await new Promise(resolve => {
        const timeoutId = setTimeout(resolve, remainingTime);
        this.timeouts.push(timeoutId);
      });
    }

    this.updateProgress(100, 'Ready!');
    
    // Brief pause to show completion
    await new Promise(resolve => {
      const timeoutId = setTimeout(resolve, 300); // Reduced from 400ms
      this.timeouts.push(timeoutId);
    });

    // End splash timing
    performanceMonitor.endTiming('splash-display');
    performanceMonitor.mark('splash-hidden');

    // Hide Capacitor splash screen with enhanced timing for iOS
    if (this.isCapacitor) {
      try {
        Logger.info('Hiding Capacitor splash with iOS optimization...');
        await SplashScreen.hide({
          fadeOutDuration: 500
        });
        Logger.success('Capacitor splash hidden with smooth iOS transition');
      } catch (error) {
        Logger.warn('Failed to hide Capacitor splash:', error);
      }
    }

    // Enhanced fade transition
    if (this.splashElement) {
      this.splashElement.classList.add('fade-out');
    }
    
    if (this.appShellElement) {
      this.appShellElement.classList.add('ready');
    }

    // Remove splash from DOM after enhanced animation
    const cleanupTimeout = setTimeout(() => {
      if (this.splashElement) {
        this.splashElement.remove();
      }
    }, 1000);
    this.timeouts.push(cleanupTimeout);

    // Mark app as fully interactive
    performanceMonitor.mark('app-interactive');
    if (window.APP_PERFORMANCE) {
      window.APP_PERFORMANCE.mark('app-interactive');
    }
  }

  // Cleanup method to prevent memory leaks
  cleanup() {
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts = [];
  }
}

// Enhanced App Launcher with iOS Optimizations
class AppLauncher {
  private splash: SplashManager;
  private loadingSteps: number;
  private totalSteps: number;
  private isLaunching: boolean;

  constructor() {
    this.splash = new SplashManager();
    this.loadingSteps = 0;
    this.totalSteps = 5;
    this.isLaunching = false;

    // Start timing app initialization
    performanceMonitor.startTiming('app-init');
  }

  async launch(): Promise<void> {
    if (this.isLaunching) {
      Logger.warn('Launch already in progress');
      return;
    }

    this.isLaunching = true;

    try {
      // Mark launch start
      performanceMonitor.mark('launch-start');
      if (window.APP_PERFORMANCE) {
        window.APP_PERFORMANCE.mark('launch-start');
      }

      // Step 1: Initialize core systems
      this.updateProgress(15, 'Loading core systems...');
      await this.simulateAsyncWork(200); // Reduced from 300ms

      // Step 2: Setup security & validation
      this.updateProgress(35, 'Initializing security...');
      await this.simulateAsyncWork(150); // Reduced from 200ms

      // Step 3: Setup React
      this.updateProgress(60, 'Setting up interface...');
      performanceMonitor.startTiming('react-setup');
      await this.initializeReact();
      performanceMonitor.endTiming('react-setup');

      // Step 4: Initialize app data
      this.updateProgress(80, 'Preparing your experience...');
      await this.simulateAsyncWork(150); // Reduced from 200ms

      // Step 5: Complete and hide splash
      performanceMonitor.endTiming('app-init');
      await this.splash.hideWhenReady();

      // Log final performance report after everything is loaded
      if (import.meta.env.DEV) {
        setTimeout(() => {
          performanceMonitor.logFinalReport();
        }, 1000);
      }
      
    } catch (error) {
      Logger.error('App launch failed:', error);
      this.handleLaunchError(error);
    } finally {
      this.isLaunching = false;
      // Cleanup splash manager
      this.splash.cleanup();
    }
  }

  private updateProgress(progress: number, message?: string): void {
    this.splash.updateProgress(progress, message);
  }

  private async initializeReact(): Promise<void> {
    return new Promise((resolve) => {
      const rootElement = document.getElementById("app-shell")!;
      const root = createRoot(rootElement);
      
      // Mount React app with React.StrictMode only in development
      root.render(
        import.meta.env.DEV ? (
          <React.StrictMode>
            <App />
          </React.StrictMode>
        ) : (
          <App />
        )
      );
      
      // Reduced timeout from 100ms to 50ms for faster loading
      setTimeout(() => {
        performanceMonitor.mark('react-mounted');
        resolve();
      }, 50);
    });
  }

  private async simulateAsyncWork(duration: number): Promise<void> {
    if (import.meta.env.PROD) {
      // In production, minimize artificial delays
      return new Promise(resolve => setTimeout(resolve, Math.min(duration, 50)));
    }
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  private handleLaunchError(error: Error): void {
    this.splash.updateProgress(100, 'Encountered an issue...');
    Logger.error('Launch error:', error);
    
    // Reduced timeout from 800ms to 500ms
    setTimeout(() => {
      this.splash.hideWhenReady();
    }, 500);
  }
}

// Enhanced performance monitoring for iOS
function initializePerformanceMonitoring() {
  performanceMonitor.mark('main-tsx-start');
  if (window.APP_PERFORMANCE) {
    window.APP_PERFORMANCE.mark('main-tsx-start');
  }

  // Monitor Core Web Vitals with iOS-specific metrics - only in development
  if (import.meta.env.DEV && 'PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          Logger.performance('iOS Navigation timing:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            platform: Capacitor.getPlatform()
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
}

// Enhanced startup sequence
function startApp() {
  Logger.success('Starting Drip Max app with enhanced iOS splash...');
  initializePerformanceMonitoring();
  
  const launcher = new AppLauncher();
  launcher.launch();
}

// Start when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
