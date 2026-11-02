import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/english/real-local', workers: 1, timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:3190', screenshot: 'only-on-failure' },
  reporter: 'list', outputDir: '.emh-local/browser-results',
});
