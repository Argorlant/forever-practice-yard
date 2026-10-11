import { defineConfig } from 'vite';

// base relativa: el sitio funciona igual en un dominio propio o en una
// subcarpeta de GitHub Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
