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
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: {
        panel: 'src/devtools/panel.html',
        devtools: 'src/devtools/devtools.html',
        options: 'src/options/options.html',
        injected: 'src/content/injected.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'injected') return 'injected.js';
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  base: './',
})
