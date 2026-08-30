import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SITE_BASE picks the deploy target's base path (see DEPLOYMENT.md):
//   Firebase Hosting (canonical)  → SITE_BASE=/
//   GitHub Pages (mirror)         → SITE_BASE=/saf-mental-health-site/  (default for plain builds)
const base = process.env.SITE_BASE ?? '/saf-mental-health-site/'

// The GitHub Pages mirror is a duplicate of the canonical site: tell crawlers not
// to index it, so search results point at saf-checkin.web.app only.
const noindexMirror = () => ({
  name: 'noindex-mirror',
  transformIndexHtml(html: string) {
    if (base === '/') return html
    return html.replace('</head>', '    <meta name="robots" content="noindex, follow" />\n  </head>')
  },
})

export default defineConfig(({ command }) => ({
  plugins: [react(), noindexMirror()],
  base: command === 'build' ? base : '/',
}))
