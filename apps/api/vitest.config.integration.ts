import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['src/**/*.integration.test.ts'],
    environment: 'node',
    testTimeout: 30000, // Integration tests may take longer
    hookTimeout: 30000,
  },
});
