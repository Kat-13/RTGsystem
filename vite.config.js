import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'  // Comment this out
import path from 'path'

export default defineConfig({
  plugins: [react()], // Remove tailwindcss() temporarily
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: 'all'
  }
})
