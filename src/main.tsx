import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

// Simplified Splash Manager
class SplashManager {
  private splashElement: HTMLElement | null;
  private progressFill: HTMLElement | null;
  private loadingMessage: HTMLElement | null;
  private isCapacitor: boolean;

  constructor() {
    this.splashElement = document.getElementById('html-splash');
    this.progressFill = document.getElementById('progress-fill');
    this.loadingMessage = document.getElementById('loading-message');
    this.isCapacitor = Capacitor.isNativePlatform();

    console.log('🚀 Splash Manager initialized for', Capacitor.getPlatform());
    
    // Disable auto-hide for native splash
    if (this.isCapacitor) {
      this.initCapacitorSplash();
    }
  }

  private async initCapacitorSplash() {
    try {
      await SplashScreen.show({ autoHide: false });
      console.log('✅ Native splash controlled');
    } catch (error) {
      console.warn('⚠️ Native splash warning:', error);
    }
  }

  updateProgress(progress: number, message?: string) {
    if (this.progressFill) {
      this.progressFill.style.width = `${progress}%`;
    }
    
    if (this.loadingMessage && message) {
      this.loadingMessage.textContent = message;
    }

    console.log(`📊 ${progress}% - ${message}`);
  }

  async hide() {
    // Show React app first
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.classList.add('app-ready');
      console.log('✅ React app visible');
    }

    // Wait a moment for React to render
    await new Promise(resolve => setTimeout(resolve, 200));

    // Hide native splash
    if (this.isCapacitor) {
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
        console.log('✅ Native splash hidden');
      } catch (error) {
        console.warn('⚠️ Native splash hide warning:', error);
      }
    }

    // Hide HTML splash
    if (this.splashElement) {
      this.splashElement.classList.add('fade-out');
      setTimeout(() => {
        if (this.splashElement && this.splashElement.parentNode) {
          this.splashElement.parentNode.removeChild(this.splashElement);
        }
      }, 800);
    }

    console.log('🎉 App ready!');
  }
}

// Simple App Initialization
async function initializeApp() {
  console.log('🎯 Starting DripMax...');
  
  const splash = new SplashManager();
  
  try {
    // Step 1: Setup
    splash.updateProgress(25, 'Initializing...');
    await delay(200);

    // Step 2: Mount React App
    splash.updateProgress(50, 'Loading interface...');
    const rootElement = document.getElementById("root");
    
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    // Clear root and mount React
    rootElement.innerHTML = '';
    const root = createRoot(rootElement);
    root.render(<App />);
    
    console.log('✅ React mounted successfully');
    
    // Step 3: Finalize
    splash.updateProgress(80, 'Almost ready...');
    await delay(300);

    // Step 4: Complete
    splash.updateProgress(100, 'Ready!');
    await delay(200);

    // Step 5: Show app
    await splash.hide();
    
  } catch (error) {
    console.error('💥 App init failed:', error);
    
    // Emergency fallback
    splash.updateProgress(100, 'Loading...');
    
    setTimeout(() => {
      const rootElement = document.getElementById("root");
      if (rootElement) {
        try {
          rootElement.innerHTML = '';
          const root = createRoot(rootElement);
          root.render(<App />);
          rootElement.classList.add('app-ready');
          
          // Force hide splash
          const splashEl = document.getElementById('html-splash');
          if (splashEl) splashEl.style.display = 'none';
          
          // Force hide native splash
          if (Capacitor.isNativePlatform()) {
            SplashScreen.hide().catch(() => {});
          }
          
          console.log('✅ Emergency fallback worked');
        } catch (fallbackError) {
          console.error('💥 Even fallback failed:', fallbackError);
        }
      }
    }, 1000);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}
