import { defineConfig } from 'vite';

export default defineConfig({
  server: { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
  preview: { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
});
