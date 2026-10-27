import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// iOS Safari ignores user-scalable=no, so block pinch zoom directly.
const block = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', block);
document.addEventListener('gesturechange', block);
document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
