import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/MatchSort/' : '/',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 8084, strictPort: true },
  preview: { host: '0.0.0.0', port: 8084, strictPort: true },
  test: { environment: 'node' },
});
