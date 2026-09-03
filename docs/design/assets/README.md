# LifeIndex visual asset provenance

## PWA icon

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
