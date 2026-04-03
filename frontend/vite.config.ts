import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler"]
        ]
      }
    }),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api/stories': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/sse': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/engagement': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
