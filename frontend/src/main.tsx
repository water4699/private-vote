import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress various connection and configuration errors
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (args[0]?.includes?.('cca-lite.coinbase.com') ||
      args[0]?.includes?.('ERR_CONNECTION_CLOSED') ||
      args[0]?.includes?.('Coinbase') ||
      args[0]?.includes?.('Failed to fetch remote project configuration') ||
      args[0]?.includes?.('HTTP status code: 403') ||
      args[0]?.includes?.('Origin http://localhost:5173 not found on Allowlist')) {
    return; // Suppress known connection and configuration errors
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  if (args[0]?.includes?.('Failed to load resource: the server responded with a status of 403') ||
      args[0]?.includes?.('pulse.walletconnect.org/e?')) {
    return; // Suppress WalletConnect 403 errors
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

