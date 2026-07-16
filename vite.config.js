import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Confluence/', // Must match your GitHub repository name exactly
  build: {
    outDir: 'docs', // Tells Vite to output the build to the /docs folder
    emptyOutDir: true, // Clears the folder before rebuilding
  }
})