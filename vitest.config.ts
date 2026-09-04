import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    // Match this release's package metadata; existing lifecycle logs also report this version.
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Browser suites own production preview and deployed targets; Vitest collects only unit/integration files.
    exclude: ['tests/e2e/**', 'tests/deployed/**', 'node_modules/**', 'dist/**'],
    clearMocks: true,
    restoreMocks: true,
  },
})
