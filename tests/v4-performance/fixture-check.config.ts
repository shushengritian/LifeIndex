import { defineConfig } from '@playwright/test'

// Explicit opt-in author validation, separate from the coordinated production performance command.
export default defineConfig({
  testDir: '.',
  testMatch: 'fixture-contract.spec.ts',
  outputDir: '../../test-results/v4-performance-fixture-check',
  workers: 1,
  retries: 0,
  reporter: [['list']],
})
