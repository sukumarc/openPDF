import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
