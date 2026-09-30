// Construye src/pelota como un único script clásico (window.Pelota) para la versión con three.js r128 por CDN.
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'dist-pelota', emptyOutDir: true, target: 'es2017', minify: true,
    lib: { entry: 'src/pelota/index.js', name: 'Pelota', formats: ['iife'], fileName: () => 'pelota.js' },
  },
});
