# LifeIndex visual asset provenance

## Current Ocean icon (2026-09-20, released in 2.2.2)

- Source: `lifeindex-ocean-icon.svg`, original repo-native geometric vector artwork.
- Navy `#101f35` full-bleed background, cyan curved L, blue index stroke and amber point.
- The L represents LifeIndex; three marks reference finance, focus and health without reducing the identity to a wallet.
- Foreground geometry fits in the central maskable safe circle; the OS supplies outer rounding.
- Rebuild: `node scripts/generate-app-icons.mjs`, using the installed/pinned asset generator's Sharp renderer; no downloads.
- Five runtime PNGs in `public/icons/` are replaced together. The service worker revisions their bytes on release.
- The old master below is historical provenance, not the source of current derivatives.
- iOS may cache existing home-screen artwork separately from app updates. Do not delete the app/site data to refresh an icon; export data before any installation changes.

## Historical V1 PWA icon

- Generation mode: built-in `imagegen` (`logo-brand`)
- Master: `lifeindex-icon-master.png` (1254 × 1254)
- Runtime derivatives: `public/icons/favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png`
- Generated: 2026-09-03

Final prompt:

```text
Use case: logo-brand
Asset type: iPhone PWA application icon master
Primary request: Create an original abstract symbol for LifeIndex: a calm segmented circular index ring surrounding one small centered dot, suggesting a personal life index and steady daily progress.
Scene/backdrop: solid warm off-white square background, full bleed
Style/medium: crisp flat vector-like logo mark rendered as a high-resolution square bitmap
Composition/framing: perfectly centered, large simple silhouette, balanced negative space, substantial safe margin for iOS rounded-square masking
Color palette: deep muted sage green mark (#3F6B57) on warm off-white (#F4F3EE)
Constraints: no text, no letters, no numbers, no gradients, no shadows, no transparency, no border around the canvas, no mockup, no 3D, no watermark; maintain legibility at 32px; original design only
```

The master stays outside `public/` so it is versioned for future derivatives without being shipped or precached. Runtime PNG sizes were mechanically derived from the inspected master with macOS `sips`; no generated application artifact is committed from `dist/`.
