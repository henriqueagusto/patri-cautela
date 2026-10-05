import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Evita CORS no desenvolvimento: tudo que é /api vai para o backend,
      // que atende a API nesse mesmo prefixo (fotos em /api/uploads).
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
});
