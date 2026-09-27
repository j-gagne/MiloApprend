import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true,
  },
});
