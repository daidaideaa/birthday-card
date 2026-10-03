import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate entry/output. The ordinary Pages build never includes the review UI.
export default defineConfig({
  base: '/birthday-card/',
  publicDir: '.asset-build/character-review/public',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
  build: {
    outDir: '.asset-build/character-preview',
    rollupOptions: { input: 'character-review.html' },
  },
});
