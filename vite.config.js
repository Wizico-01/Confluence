import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets load on both Vercel and GitHub Pages
  build: {
    outDir: 'dist', // Matches gh-pages -d dist
    emptyOutDir: true,
  },
})