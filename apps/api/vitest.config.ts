import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    hookTimeout: 120000,
    testTimeout: 30000,
    fileParallelism: false,
  },
});
