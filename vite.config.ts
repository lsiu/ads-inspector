import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/public/manifest.json'

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    target: 'esnext',
    // Enable sourcemaps in development
    sourcemap: isDev ? 'inline' : false,
    // Minify only in production
    minify: isDev ? false : 'esbuild',
    rollupOptions: {
      input: {
        devtools: 'src/devtools/devtools.html',
        panel: 'src/devtools/panel.html',
        options: 'src/options/options.html',
      },
    },
  },
  base: './',
})
