import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Relative paths for FiveM NUI
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Use esbuild for minification (built-in, faster)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Consistent file naming
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
