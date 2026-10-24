import { defineConfig } from 'vite';

export default defineConfig({
  // Keep the existing project structure.
  publicDir: 'public',

  server: {
    host: '0.0.0.0',
    port: 3000,
  },

  build: {
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
});