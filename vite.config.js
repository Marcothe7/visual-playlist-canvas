import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      // Native-only Capacitor plugins — dynamically imported, may not be installed
      external: [
        '@capawesome-team/capacitor-android-billing',
        '@capacitor-community/admob',
      ],
    },
  },
  server: {
    allowedHosts: 'all', // lets vercel dev's internal proxy reach the Vite dev server
  },
})
