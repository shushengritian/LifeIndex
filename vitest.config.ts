import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

// Tests and production builds must report the same version; a stale test-only constant hides release regressions.
const metadata = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}
if (!metadata.version || typeof metadata.version !== 'string') {
  console.error('[LifeIndex test] Application version metadata is missing.')
  throw new Error('Invalid application version metadata')
}
console.info('[LifeIndex test] Configuring unit and integration runner', {
  appVersion: metadata.version,
  browserSuites: 'owned-by-playwright',
})

export default defineConfig({
  define: {
    // Match this release's package metadata; existing lifecycle logs also report this version.
    __APP_VERSION__: JSON.stringify(metadata.version),
    __APP_BUILD_ID__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Performance specs also use Playwright's test lifecycle; collecting them in Vitest fails before any browser can launch.
    exclude: [
      'tests/e2e/**',
      'tests/v4-e2e/**',
      'tests/v4-performance/**',
      'tests/v4-deployed/**',
      'tests/deployed/**',
      'tests/performance/**',
      'node_modules/**',
      'dist/**',
    ],
    clearMocks: true,
    restoreMocks: true,
  },
})
