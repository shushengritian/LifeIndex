import { defineConfig } from '@playwright/test'

// Collection never builds or starts a server: the coordinator must release the frozen dist first.
export default defineConfig({
  testDir: './tests/v4-performance',
  testMatch: 'profile.spec.ts',
  outputDir: './test-results/v4-performance-runner',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 1_200_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { browserName: 'chromium', headless: true, trace: 'off', video: 'off' },
})
