import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

// Simple Splash Manager - Based on Capacitor Documentation
class SplashManager {
  private splashElement: HTMLElement | null;
  private progressFill: HTMLElement | null;
  private loadingMessage: HTMLElement | null;
  private minimumDisplayTime: number;
  private splashStartTime: number;
  private currentProgress: number;
  private isCapacitor: boolean;

  constructor() {
    this.splashElement = document.getElementById('html-splash');
    this.progressFill = document.getElementById('progress-fill');
    this.loadingMessage = document.getElementById('loading-message');
    this.minimumDisplayTime = 2000; // 2 seconds minimum for smooth UX
    this.splashStartTime = Date.now();
    this.currentProgress = 0;
    this.isCapacitor = Capacitor.isNativePlatform();

    console.log('🚀 Splash Manager initialized for', Capacitor.getPlatform());
    console.log('🔍 Splash elements found:', {
      splashElement: !!this.splashElement,
      progressFill: !!this.progressFill,
      loadingMessage: !!this.loadingMessage
    });

    // Handle Capacitor splash screen (disable auto-hide)
    if (this.isCapacitor) {
      this.initializeCapacitorSplash();
    }
  }

  private async initializeCapacitorSplash(): Promise<void> {
    try {
      // Keep native splash visible until we're ready (Capacitor best practice)
      await SplashScreen.show({
        autoHide: false,
        fadeInDuration: 0,
        fadeOutDuration: 500
      });
      console.log('✅ Native splash screen secured');
    } catch (error) {
      console.warn('❌ Capacitor splash init failed:', error);
    }
  }

  updateProgress(progress: number, message?: string) {
    this.currentProgress = Math.max(this.currentProgress, progress);
    
    if (this.progressFill) {
      this.progressFill.style.width = `${this.currentProgress}%`;
    }
    
    if (this.loadingMessage && message) {
      this.loadingMessage.textContent = message;
    }

    console.log(`📊 Progress: ${progress}% - ${message}`);
  }

  async hideWhenReady(): Promise<void> {
    // Ensure minimum display time for smooth UX
    const elapsed = Date.now() - this.splashStartTime;
    const remainingTime = Math.max(0, this.minimumDisplayTime - elapsed);
    
    if (remainingTime > 0) {
      this.updateProgress(95, 'Finalizing...');
      console.log(`⏱️ Waiting ${remainingTime}ms more for smooth transition`);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    this.updateProgress(100, 'Ready!');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Show React app first
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.classList.add('app-ready');
      console.log('✅ React app revealed');
    }

    // Small delay to ensure React app is visible
    await new Promise(resolve => setTimeout(resolve, 200));

    // Hide native Capacitor splash screen
    if (this.isCapacitor) {
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
        console.log('✅ Native splash hidden');
      } catch (error) {
        console.warn('❌ Failed to hide native splash:', error);
      }
    }

    // Hide HTML splash screen with animation
    if (this.splashElement) {
      this.splashElement.classList.add('fade-out');
      // Remove from DOM after animation
      setTimeout(() => {
        if (this.splashElement) {
          this.splashElement.remove();
        }
      }, 800);
    }

    console.log('🎉 App fully loaded and splash hidden!');
  }
}

// Simple App Launcher - Fixed React mounting issue
class AppLauncher {
  private splash: SplashManager;

  constructor() {
    this.splash = new SplashManager();
  }

  async launch(): Promise<void> {
    try {
      console.log('🚀 Starting app launch sequence...');

      // Step 1: Initialize
      this.splash.updateProgress(20, 'Initializing...');
      await this.delay(300);

      // Step 2: Setup React (FIXED - mount to correct element)
      this.splash.updateProgress(50, 'Loading interface...');
      await this.initializeReact();

      // Step 3: Finalize
      this.splash.updateProgress(80, 'Almost ready...');
      await this.delay(400);

      // Step 4: Hide splash and show app
      await this.splash.hideWhenReady();
      
    } catch (error) {
      console.error('💥 App launch failed:', error);
      this.handleLaunchError(error);
    }
  }

  private async initializeReact(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const rootElement = document.getElementById("root");
        if (!rootElement) {
          throw new Error("Root element #root not found");
        }

        // Clear any existing content and ensure it's ready
        rootElement.innerHTML = '';
        
        const root = createRoot(rootElement);
        root.render(<App />);
        
        console.log('✅ React app mounted to #root successfully');
        
        // Give React time to render properly
        setTimeout(() => {
          resolve();
        }, 300);
        
      } catch (error) {
        console.error('💥 React mounting failed:', error);
        reject(error);
      }
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleLaunchError(error: Error): void {
    this.splash.updateProgress(100, 'Error occurred...');
    console.error('💥 Launch error:', error);
    
    // Still try to hide splash and show app
    setTimeout(() => {
      this.splash.hideWhenReady();
    }, 1000);
  }
}

// Start the app
function startApp() {
  console.log('🎯 DripMax starting with improved splash system...');
  
  try {
    const launcher = new AppLauncher();
    launcher.launch();
  } catch (error) {
    console.error('💥 Failed to start app launcher:', error);
    // Fallback: directly mount React app
    fallbackLaunch();
  }
}

// Fallback launch if splash system fails
function fallbackLaunch() {
  console.log('🔄 Using fallback launch...');
  
  try {
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = '';
      const root = createRoot(rootElement);
      root.render(<App />);
      
      // Hide splash elements
      const splashElement = document.getElementById('html-splash');
      if (splashElement) {
        splashElement.style.display = 'none';
      }
      
      // Show app
      rootElement.classList.add('app-ready');
      console.log('✅ Fallback launch successful');
    }
  } catch (error) {
    console.error('💥 Fallback launch also failed:', error);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
