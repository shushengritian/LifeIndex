import { defineConfig, devices } from '@playwright/test'

const rawUrl = process.env.LIFEINDEX_DEPLOYED_URL
if (!rawUrl) throw new Error('LIFEINDEX_DEPLOYED_URL is required for V4 deployed verification')
const target = new URL(rawUrl)
const local = ['127.0.0.1', 'localhost'].includes(target.hostname)
if (target.protocol !== 'https:' && !(local && target.protocol === 'http:'))
  throw new Error('Deployed verification requires HTTPS or an explicit local preview')
target.hash = ''
target.search = ''
if (!target.pathname.endsWith('/')) target.pathname += '/'

// Every test receives a fresh, synthetic-only context. No authenticated profile or production records are reused.
console.info('v4.deployed.configuration', {
  operation: 'verify',
  targetType: local ? 'preview' : 'live',
})
export default defineConfig({
  testDir: './tests/v4-deployed',
  outputDir: './test-results/v4-deployed',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/v4-deployed', open: 'never' }],
    ['json', { outputFile: 'test-results/v4-deployed/results.json' }],
  ],
  use: {
    baseURL: target.toString(),
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'v4-live-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 664 } },
    },
    {
      name: 'v4-live-webkit',
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 664 } },
    },
  ],
})
