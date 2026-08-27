import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/glass.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/pwa'
import { FEATURES } from './lib/flags'

// LUC-89: every rule in styles/glass.css is scoped to html[data-buttons="glass"],
// so flipping FEATURES.glassButtons restores the solid buttons with no other change.
document.documentElement.dataset.buttons = FEATURES.glassButtons ? 'glass' : 'solid'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
