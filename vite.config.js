import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Uses '/' on Vercel so assets don't 404, and '/Confluence/' on GitHub Pages
  base: process.env.VERCEL ? '/' : '/Confluence/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})