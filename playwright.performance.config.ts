import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/performance',
  outputDir: './test-results/performance',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4184',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    // Cold-load profiling excludes worker-cache warmup; offline/update behavior has separate tests.
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4184',
    port: 4184,
    reuseExistingServer: !process.env.CI,
  },
})
