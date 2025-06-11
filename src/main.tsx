import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Hide initial loader and mark app as loaded
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('app-loaded');
});

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(<App />);

// Ensure loader is hidden after React renders
setTimeout(() => {
  document.body.classList.add('app-loaded');
}, 100);
