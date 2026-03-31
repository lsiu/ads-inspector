import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/public/manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    target: 'esnext',
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
