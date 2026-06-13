import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
  build: {
    // Nomes fixos (sem hash) para facilitar atualizações por upload manual no GitHub
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
