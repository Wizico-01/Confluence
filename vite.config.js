import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Confluence/",
  build: {
    outDir: "docs", // Compiles files into /docs instead of /dist
  },
});