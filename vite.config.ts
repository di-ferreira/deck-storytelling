import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/webview',
  plugins: [react()],
  build: {
    outDir: '../../dist/webview',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/webview/src/main.tsx',
      output: {
        entryFileNames: 'main.js',
        assetFileNames: (asset) => (asset.name?.endsWith('.css') ? 'main.css' : 'assets/[name]-[hash][extname]'),
        inlineDynamicImports: true,
      },
    },
  },
});
