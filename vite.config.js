import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: false,     // Disable minification for debugging
    sourcemap: true    // Enable source maps for debugging
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: 'all'
  }
})
