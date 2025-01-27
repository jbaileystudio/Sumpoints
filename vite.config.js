import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './',
  base: '/Sumpoints/', // Base path to match your GitHub repository name
  build: {
    outDir: 'dist',
  },
})
