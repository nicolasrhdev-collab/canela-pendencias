import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, host: '0.0.0.0' },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Firebase e React em arquivos separados: o navegador guarda e não baixa de novo a cada atualização do app.
        manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'], react: ['react', 'react-dom'] },
      },
    },
  },
});
