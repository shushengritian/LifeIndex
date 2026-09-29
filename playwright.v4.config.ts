import { defineConfig, devices } from '@playwright/test'

// This suite targets a previously built V4 dist. The application identity guard fails on an old build.
export default defineConfig({
  testDir: './tests/v4-e2e',
  outputDir: './test-results/v4',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/v4', open: 'never' }],
    ['json', { outputFile: 'test-results/v4/results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'v4-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 664 } },
    },
    { name: 'v4-webkit', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 664 } } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 20_000,
  },
})
