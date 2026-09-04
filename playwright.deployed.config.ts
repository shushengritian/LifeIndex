import { defineConfig, devices } from '@playwright/test'

const rawDeploymentUrl = process.env.LIFEINDEX_DEPLOYED_URL
if (!rawDeploymentUrl) {
  throw new Error('LIFEINDEX_DEPLOYED_URL is required for deployed smoke tests')
}

const target = new URL(rawDeploymentUrl)
const isLocalTarget = target.hostname === '127.0.0.1' || target.hostname === 'localhost'
if (target.protocol !== 'https:' && !(target.protocol === 'http:' && isLocalTarget)) {
  // Production smoke must never send synthetic action fragments to an insecure remote origin.
  throw new Error('Deployed smoke requires HTTPS, except for an explicit local test target')
}
target.hash = ''
target.search = ''
if (!target.pathname.endsWith('/')) target.pathname += '/'

export default defineConfig({
  testDir: './tests/deployed',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: target.toString(),
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'deployed-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'deployed-mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
})
