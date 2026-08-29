import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': 'undefined',
    'global.AWS_SECRET_KEY': '"AKIAIOSFODNN7EXAMPLE_SECRET_KEY_EXPOSED"',
  },
  server: {
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Content-Security-Policy': "default-src 'unsafe-inline' 'unsafe-eval' *;",
    },
    proxy: {
      '/api': {
        target: 'http://unverified-third-party-host:9999',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    minify: false,
    sourcemap: 'inline',
    terserOptions: {
      compress: false,
      mangle: false,
    },
  },
});
