import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Use default esbuild minifier instead of terser to avoid "terser not found" error
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'dexie', 'lucide-react'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable']
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
});