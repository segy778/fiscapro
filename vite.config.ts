/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Bibliothèques isolées dans leurs propres fichiers : mieux mises en
        // cache par le navigateur entre deux déploiements de l'app.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    watch: {
      // Le polling évite la limite système de file watchers (ENOSPC) dans
      // les environnements conteneurisés. Ignore aussi les dossiers hors projet.
      usePolling: true,
      interval: 300,
      ignored: ['**/node_modules/**', '**/.cache/**', '**/.git/**', '**/dist/**'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
