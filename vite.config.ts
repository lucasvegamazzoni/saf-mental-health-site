import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SITE_BASE picks the deploy target's base path (see DEPLOYMENT.md):
//   Firebase Hosting (canonical)  → SITE_BASE=/
//   GitHub Pages (mirror)         → SITE_BASE=/saf-mental-health-site/  (default for plain builds)
const base = process.env.SITE_BASE ?? '/saf-mental-health-site/'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? base : '/',
}))
