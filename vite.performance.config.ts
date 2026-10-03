import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  mode: 'story-review',
  base: '/birthday-card/',
  publicDir: process.env.VITE_ASSET_BASE_URL ? '.asset-build/performance-remote/public' : '.asset-build/performance-review/public',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5184, strictPort: true },
  build: {
    outDir: '.asset-build/performance-preview',
    rollupOptions: { input: ['performance-review.html', 'index.html'] },
  },
});
