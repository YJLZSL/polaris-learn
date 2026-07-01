import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      external: [
        '@capacitor/preferences',
        '@capacitor/clipboard',
        '@capacitor/safe-area',
      ],
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
