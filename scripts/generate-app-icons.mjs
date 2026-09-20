import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Reuse the pinned asset generator's renderer; this script never downloads an executable.
const require = createRequire(import.meta.url)
const assetRequire = createRequire(require.resolve('@vite-pwa/assets-generator'))
const sharp = assetRequire('sharp')
const source = fileURLToPath(
  new URL('../docs/design/assets/lifeindex-ocean-icon.svg', import.meta.url),
)
const outputs = [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
]
try {
  console.info('icons.generation.started', { count: outputs.length })
  // The SVG is opaque and has mask-safe margins; no second border or rounding is baked in.
  for (const [name, size] of outputs) {
    await sharp(source)
      .resize(size, size)
      .png()
      .toFile(fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url)))
  }
  console.info('icons.generation.completed', { count: outputs.length })
} catch (error) {
  console.error('icons.generation.failed', {
    failureClass: error instanceof Error ? error.name : 'UnknownError',
  })
  process.exitCode = 1
}
