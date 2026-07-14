import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Test-only config (kept separate from vite.config.ts so the build stays lean).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
