import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

// Bulletproof app initialization
function startApp() {
  console.log('🚀 Starting DripMax...');
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('❌ Root element not found!');
    return;
  }

  // Mount React app immediately
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('✅ React app mounted');
    
    // Show the app
    rootElement.style.opacity = '1';
    rootElement.classList.add('app-ready');
    
    // Hide splash screens after a short delay
    setTimeout(() => {
      // Hide HTML splash
      const splash = document.getElementById('html-splash');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => {
          if (splash.parentNode) {
            splash.parentNode.removeChild(splash);
          }
        }, 300);
      }
      
      // Hide native splash on mobile
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 500 }).catch(() => {
          console.log('Native splash already hidden');
        });
      }
      
      console.log('✅ App ready!');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Failed to mount React:', error);
    
    // Emergency fallback - show basic content
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 100vh; 
        background: #1A1F2C; 
        color: white; 
        text-align: center;
        font-family: sans-serif;
      ">
        <div>
          <h1 style="color: #f97316; margin-bottom: 20px;">DripMax</h1>
          <p>Loading failed. Please refresh the page.</p>
          <button onclick="location.reload()" style="
            background: #f97316; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            margin-top: 20px;
            cursor: pointer;
          ">Refresh</button>
        </div>
      </div>
    `;
    rootElement.style.opacity = '1';
  }
}

// Start immediately when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
