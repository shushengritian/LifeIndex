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
          globPatterns: ['**/*.{html,js,css,svg,png,webmanifest}'],
        },
        manifest: {
          id: base,
          name: 'LifeIndex',
          short_name: 'LifeIndex',
          description: 'Index your life.',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#f4f3ee',
          theme_color: '#f4f3ee',
          lang: 'zh-CN',
          categories: ['lifestyle', 'productivity', 'finance'],
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(packageMetadata.version),
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
