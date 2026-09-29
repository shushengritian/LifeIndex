import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

interface PackageMetadata {
  version: string
}

const packageMetadata = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as PackageMetadata

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return '/'

  // A single normalized contract keeps built assets, manifest scope, and the worker under one Pages path.
  return `/${value.replace(/^\/+|\/+$/g, '')}/`
}

export default defineConfig(() => {
  const base = normalizeBasePath(process.env.LIFEINDEX_BASE_PATH)
  // Public build provenance identifies the exact Pages commit and makes local A/B update checks observable.
  const buildId = process.env.LIFEINDEX_BUILD_ID ?? process.env.GITHUB_SHA ?? 'local'
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(buildId)) throw new Error('Invalid public build identifier')

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: null,
        injectManifest: {
          // The locally licensed variable font is shell material and must also work after an offline reload.
          globPatterns: ['**/*.{html,js,css,svg,png,ttf,woff2,webmanifest}'],
        },
        manifest: {
          id: base,
          name: 'LifeIndex',
          short_name: 'LifeIndex',
          description: 'Index your life.',
          start_url: base,
          scope: base,
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait-primary',
          background_color: '#f5f0e8',
          theme_color: '#f5f0e8',
          lang: 'zh-CN',
          categories: ['lifestyle', 'productivity', 'finance'],
          prefer_related_applications: false,
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(packageMetadata.version),
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
    },
  }
})
