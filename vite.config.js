import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Keeps asset paths relative so both Vercel and GitHub Pages resolve assets correctly
  build: {
    outDir: 'dist', // Aligned with the gh-pages deployment script
    emptyOutDir: true,
  },
})