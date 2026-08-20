import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // Arena live-preview host (*.e2b.app)
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
