import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { performanceMonitor } from './utils/performance-monitor.ts'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

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

// Smart Splash Manager with Capacitor Integration
class SplashManager {
  private splashElement: HTMLElement | null;
  private appShellElement: HTMLElement | null;
  private progressFill: HTMLElement | null;
  private loadingMessage: HTMLElement | null;
  private minimumDisplayTime: number;
  private splashStartTime: number;
  private currentProgress: number;
  private isCapacitor: boolean;

  constructor() {
    this.splashElement = document.getElementById('html-splash');
    this.appShellElement = document.getElementById('app-shell');
    this.progressFill = document.getElementById('progress-fill');
    this.loadingMessage = document.getElementById('loading-message');
    this.minimumDisplayTime = 2000; // Increased for better UX
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
      // The native splash should already be showing from the launch
      // Make sure it stays visible until we're ready
      console.log('🚀 Capacitor splash screen active');
      
      // Ensure splash stays visible (in case of any auto-hide)
      await SplashScreen.show({
        autoHide: false,
        fadeInDuration: 0
      });
      
      console.log('✅ Capacitor splash screen secured');
    } catch (error) {
      console.warn('Capacitor splash screen not available:', error);
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
    // Ensure minimum display time for smooth UX
    const elapsed = Date.now() - this.splashStartTime;
    const remainingTime = Math.max(0, this.minimumDisplayTime - elapsed);
    
    if (remainingTime > 0) {
      this.updateProgress(90, 'Almost ready...');
      console.log(`⏱️ Waiting ${remainingTime}ms more for smooth transition`);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    this.updateProgress(100, 'Welcome!');
    
    // Small delay to show 100% progress
    await new Promise(resolve => setTimeout(resolve, 300));

    // End splash timing
    performanceMonitor.endTiming('splash-display');
    performanceMonitor.mark('splash-hidden');

    // Hide Capacitor splash screen first if on native platform
    if (this.isCapacitor) {
      try {
        console.log('🔄 Hiding Capacitor splash screen...');
        await SplashScreen.hide({
          fadeOutDuration: 300
        });
        console.log('✅ Capacitor splash screen hidden');
      } catch (error) {
        console.warn('Failed to hide Capacitor splash:', error);
      }
    }

    // Fade out HTML splash and fade in app
    if (this.splashElement) {
      this.splashElement.classList.add('fade-out');
    }
    
    if (this.appShellElement) {
      this.appShellElement.classList.add('ready');
    }

    // Remove splash from DOM after animation
    setTimeout(() => {
      if (this.splashElement) {
        this.splashElement.remove();
      }
    }, 800);

    // Mark app as fully loaded
    performanceMonitor.mark('app-interactive');
    if (window.APP_PERFORMANCE) {
      window.APP_PERFORMANCE.mark('app-interactive');
    }
  }
}

// App Launcher with orchestrated loading
class AppLauncher {
  private splash: SplashManager;
  private loadingSteps: number;
  private totalSteps: number;

  constructor() {
    this.splash = new SplashManager();
    this.loadingSteps = 0;
    this.totalSteps = 4;

    // Start timing app initialization
    performanceMonitor.startTiming('app-init');
  }

  async launch(): Promise<void> {
    try {
      // Mark launch start
      performanceMonitor.mark('launch-start');
      if (window.APP_PERFORMANCE) {
        window.APP_PERFORMANCE.mark('launch-start');
      }

      // Step 1: Initialize core systems
      this.updateProgress(20, 'Loading core systems...');
      await this.simulateAsyncWork(400);

      // Step 2: Setup React
      this.updateProgress(50, 'Setting up interface...');
      performanceMonitor.startTiming('react-setup');
      await this.initializeReact();
      performanceMonitor.endTiming('react-setup');

      // Step 3: Initialize app data
      this.updateProgress(75, 'Preparing your experience...');
      await this.simulateAsyncWork(300);

      // Step 4: Complete and hide splash
      performanceMonitor.endTiming('app-init');
      await this.splash.hideWhenReady();

      // Log final performance report after everything is loaded
      setTimeout(() => {
        performanceMonitor.logFinalReport();
      }, 1000);
      
    } catch (error) {
      console.error('App launch failed:', error);
      this.handleLaunchError(error);
    }
  }

  private updateProgress(progress: number, message?: string): void {
    this.splash.updateProgress(progress, message);
  }

  private async initializeReact(): Promise<void> {
    return new Promise((resolve) => {
      const rootElement = document.getElementById("app-shell")!;
      const root = createRoot(rootElement);
      
      // Mount React app
      root.render(<App />);
      
      // Simulate React hydration
      setTimeout(() => {
        performanceMonitor.mark('react-mounted');
        resolve();
      }, 200);
    });
  }

  private async simulateAsyncWork(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  private handleLaunchError(error: Error): void {
    this.splash.updateProgress(100, 'Something went wrong...');
    console.error('Launch error:', error);
    
    // Fallback: still hide splash after error
    setTimeout(() => {
      this.splash.hideWhenReady();
    }, 1000);
  }
}

// Performance monitoring
function initializePerformanceMonitoring() {
  performanceMonitor.mark('main-tsx-start');
  if (window.APP_PERFORMANCE) {
    window.APP_PERFORMANCE.mark('main-tsx-start');
  }

  // Monitor Core Web Vitals
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('📊 Navigation timing:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
}

// Launch sequence
function startApp() {
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
