import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Dev: proxy the backend routes so the browser talks to the SAME origin (5173).
  // This sidesteps CORS entirely and lets the SameSite=Lax session cookie flow
  // (it is not sent on cross-origin fetches). The frontend uses relative URLs in
  // dev (see shared/config/env.ts). Change the target if the API runs elsewhere.
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/transfers': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
