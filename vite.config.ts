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
    rolldownOptions: {
      input: {
        // The key 'panel' is arbitrary; the path is what matters.
        panel: 'src/devtools/panel.html',
      },
    },
  },
})
