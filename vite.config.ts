/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false,
    // Cuando exista el backend Flask, descomenta esto para que /api vaya a él
    // sin problemas de CORS durante el desarrollo:
    // proxy: { '/api': 'http://127.0.0.1:5000' },
  },
  build: {
    target: 'es2022',
    // Phaser pesa ~1.2 MB minificado; lo separamos en su propio chunk y
    // subimos el umbral para que el build no avise por algo esperado.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
