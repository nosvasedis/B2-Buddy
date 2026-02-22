import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env is polyfilled for the libraries that might need it,
    // though we prefer import.meta.env in Vite.
    'process.env': {} 
  }
})