import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served from https://lucasvegamazzoni.github.io/saf-mental-health-site/ in prod
  base: command === 'build' ? '/saf-mental-health-site/' : '/',
}))
