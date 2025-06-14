import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'api-tests',
      testMatch: /.*\.spec\.ts$/,
    },
  ],
  reporter: [
    ['html'],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: false
    }]
  ],
  fullyParallel: true,
  /* Configure number of workers */
  workers: 4,
}); 