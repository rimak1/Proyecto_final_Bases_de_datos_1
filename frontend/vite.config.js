import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /uploads se redirigen a la API de Express (puerto 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
