import { defineConfig } from '@playwright/test'

// Browser contract checks use a dedicated output directory and never collect performance samples.
export default defineConfig({
  testDir: '.',
  testMatch: 'probe-contract.spec.ts',
  outputDir: '../../test-results/v4-performance-probe-check',
  workers: 1,
  retries: 0,
  reporter: [['list']],
})
