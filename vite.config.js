import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'index.js'),
      formats: ['es']
    },
    rollupOptions: {
      input: resolve(__dirname, 'index.js'),
      output: {
        entryFileNames: 'sugar.js',
        format: 'es',
        exports: 'named'
      }
    }
  }
});
