import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

// Simple splash screen manager
let progress = 0;
let currentMessage = 'Starting...';

function updateProgress(newProgress: number, message?: string) {
  progress = newProgress;
  if (message) currentMessage = message;
  
  const progressFill = document.getElementById('progress-fill');
  const loadingMessage = document.getElementById('loading-message');
  
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
  
  if (loadingMessage && message) {
    loadingMessage.textContent = message;
  }
  
  console.log(`${progress}% - ${currentMessage}`);
}

async function hideSplash() {
  console.log('🎯 Hiding splash screen...');
  
  // Show React app
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.classList.add('app-ready');
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Hide native splash if on mobile
  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide({ fadeOutDuration: 300 });
      console.log('✅ Native splash hidden');
    } catch (error) {
      console.warn('Native splash warning:', error);
    }
  }
  
  // Hide HTML splash
  const splashElement = document.getElementById('html-splash');
  if (splashElement) {
    splashElement.classList.add('fade-out');
    setTimeout(() => {
      if (splashElement.parentNode) {
        splashElement.parentNode.removeChild(splashElement);
      }
    }, 800);
  }
  
  console.log('✅ App ready!');
}

// Initialize app
async function initApp() {
  console.log('🚀 Starting DripMax...');
  
  try {
    // Update progress
    updateProgress(25, 'Loading app...');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mount React
    updateProgress(50, 'Starting interface...');
    const rootElement = document.getElementById("root");
    
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    const root = createRoot(rootElement);
    root.render(<App />);
    
    updateProgress(75, 'Almost ready...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateProgress(100, 'Ready!');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Hide splash
    await hideSplash();
    
  } catch (error) {
    console.error('App init failed:', error);
    
    // Emergency fallback - just show the app
    setTimeout(() => {
      const rootElement = document.getElementById("root");
      if (rootElement) {
        const root = createRoot(rootElement);
        root.render(<App />);
        rootElement.classList.add('app-ready');
        
        // Force hide splash
        const splashEl = document.getElementById('html-splash');
        if (splashEl) splashEl.style.display = 'none';
        
        if (Capacitor.isNativePlatform()) {
          SplashScreen.hide().catch(() => {});
        }
      }
    }, 500);
  }
}

// Start app when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
