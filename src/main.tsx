import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Dev bypass - auto-login in development if VITE_DEV_BYPASS env var is set
if (import.meta.env.DEV) {
  import('./devBypass')
}
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
