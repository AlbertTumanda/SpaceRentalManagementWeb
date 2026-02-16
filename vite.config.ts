import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env.API_KEY is replaced during build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
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