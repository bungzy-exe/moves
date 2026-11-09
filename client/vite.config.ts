import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Where the Express backend runs during local development.
// Override with VITE_API_TARGET if you start the backend on another port.
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Listen on the local network too, so the app can be opened on a phone.
    host: true,
    // Every /api request goes to the backend unchanged (the backend's routes
    // include the /api prefix). The browser only ever talks to one origin,
    // so session cookies behave the same way as in a deployed version.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
      },
    },
  },
})
