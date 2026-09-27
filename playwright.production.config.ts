import { defineConfig } from '@playwright/test';
import config from './playwright.config';

// Même parcours réel, servi depuis dist au lieu du serveur de développement.
export default defineConfig({
  ...config,
  use: { ...config.use, baseURL: 'http://localhost:4173' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
});
