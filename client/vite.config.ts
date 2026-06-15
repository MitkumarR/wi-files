import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Whenever React fetches '/api', forward it to the Go server
      '/api': 'http://localhost:8080'
    }
  }
})

