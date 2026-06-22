import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Le moteur 3D (three.js) est volumineux mais chargé à la demande (chunk
    // séparé, lazy). On relève le seuil d'alerte plutôt que d'être prévenu à
    // chaque build.
    chunkSizeWarningLimit: 1100,
  },
})
