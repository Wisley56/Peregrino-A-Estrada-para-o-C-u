import { defineConfig } from 'vite';
import { ink } from './tools/vite-plugin-ink';

export default defineConfig({
  base: './',
  plugins: [ink()],
  server: { port: 5180 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
