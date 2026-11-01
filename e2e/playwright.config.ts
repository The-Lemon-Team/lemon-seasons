import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_SPARKS_DIR = path.join(os.tmpdir(), 'lemon-test-sparks-empty');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node dist/main',
      cwd: path.resolve(ROOT_DIR, 'apps/backend'),
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3001',
        DATABASE_URL: 'postgresql://lemon:lemon_secret@127.0.0.1:5435/lemon_calendarium_test?schema=public',
        NODE_ENV: 'test',
        ADMIN_TOKEN: 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
        SPARKS_INCOMING_DIR: TEST_SPARKS_DIR,
        GDRIVE_SYNC_FOLDER: '',
      },
      timeout: 60000,
    },
    {
      command: 'pnpm --filter @lenta/feed-app run dev --port 5175',
      cwd: ROOT_DIR,
      url: 'http://localhost:5175',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
