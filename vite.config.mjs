import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const PORT = '3000';

  return {
    server: {
      open: true,
      port: PORT,
    },
    define: {
      global: 'window',
    },
    build: {
      outDir: 'dist', // Explicitly set output to dist
    },
    preview: {
      open: true,
      port: PORT,
    },
    base: '/', // Root for Firebase Hosting
    plugins: [react(), jsconfigPaths()],
  };
});