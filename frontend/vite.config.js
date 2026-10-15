import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/customers': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/products': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/wishlist': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/cart': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/orders': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
