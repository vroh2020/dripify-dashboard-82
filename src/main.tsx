import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import React from 'react'

// Simple App Launcher
function startApp() {
  console.log('Starting Trendza app...');
  
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
}

// Start when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
