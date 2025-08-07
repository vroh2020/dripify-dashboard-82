import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import React from 'react'

// Simple Splash Manager
class SplashManager {
  private splashElement: HTMLElement | null;
  private appShellElement: HTMLElement | null;
  private minimumDisplayTime: number;
  private splashStartTime: number;

  constructor() {
    this.splashElement = document.getElementById('html-splash');
    this.appShellElement = document.getElementById('app-shell');
    this.minimumDisplayTime = 1500; // Reduced for better UX
    this.splashStartTime = Date.now();

    // Initialize Capacitor splash screen if on native platform
    if (Capacitor.isNativePlatform()) {
      this.initializeCapacitorSplash();
    }
  }

  private async initializeCapacitorSplash(): Promise<void> {
    try {
      await SplashScreen.show({
        autoHide: false,
        fadeInDuration: 0,
        fadeOutDuration: 500
      });
    } catch (error) {
      console.warn('Capacitor splash screen initialization failed:', error);
    }
  }

  async hideWhenReady(): Promise<void> {
    // Ensure minimum display time
    const elapsed = Date.now() - this.splashStartTime;
    const remainingTime = Math.max(0, this.minimumDisplayTime - elapsed);
    
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    // Hide Capacitor splash screen
    if (Capacitor.isNativePlatform()) {
      try {
        await SplashScreen.hide({ fadeOutDuration: 500 });
      } catch (error) {
        console.warn('Failed to hide Capacitor splash:', error);
      }
    }

    // Hide HTML splash
    if (this.splashElement) {
      this.splashElement.classList.add('fade-out');
    }
    
    if (this.appShellElement) {
      this.appShellElement.classList.add('ready');
    }

    // Remove splash from DOM
    setTimeout(() => {
      if (this.splashElement) {
        this.splashElement.remove();
      }
    }, 1000);
  }
}

// Simple App Launcher
class AppLauncher {
  private splash: SplashManager;
  private isLaunching: boolean;

  constructor() {
    this.splash = new SplashManager();
    this.isLaunching = false;
  }

  async launch(): Promise<void> {
    if (this.isLaunching) return;

    this.isLaunching = true;

    try {
      // Initialize React
      await this.initializeReact();

      // Hide splash when ready
      await this.splash.hideWhenReady();
      
    } catch (error) {
      console.error('App launch failed:', error);
      await this.splash.hideWhenReady();
    } finally {
      this.isLaunching = false;
    }
  }

  private async initializeReact(): Promise<void> {
    return new Promise((resolve) => {
      const rootElement = document.getElementById("app-shell")!;
      const root = createRoot(rootElement);
      
      root.render(
        import.meta.env.DEV ? (
          <React.StrictMode>
            <App />
          </React.StrictMode>
        ) : (
          <App />
        )
      );
      
      setTimeout(resolve, 50);
    });
  }
}

// Start app
function startApp() {
  console.log('🚀 Starting Drip Max app...');
  
  const launcher = new AppLauncher();
  launcher.launch();
}

// Start when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
