/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { optimizeArt } from './scripts/vite-plugin-optimize-art'

export default defineConfig({
  // `optimizeArt` shrinks the bundled creature portraits; source art in
  // public/img/ is left exactly as exported.
  plugins: [react(), tailwindcss(), optimizeArt()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})
