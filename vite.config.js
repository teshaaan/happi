import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Refactored build configuration crossing subsystems
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
});
