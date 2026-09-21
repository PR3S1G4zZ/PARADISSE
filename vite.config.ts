import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // MapLibre GL 6 locates its worker beside import.meta.url. Pre-bundling
    // rewrites that URL into .vite/deps, where maplibre-gl-worker.mjs does not
    // exist, so GeoJSON sources never finish loading.
    exclude: ['maplibre-gl'],
  },
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
