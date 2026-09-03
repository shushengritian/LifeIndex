# LifeIndex

> Index your life.

LifeIndex is a local-first personal life index for iPhone. The V1 progressive web app records finances, focus sessions, and habits while keeping the primary data in the device's IndexedDB database.

## Project status

LifeIndex has completed its five V1 product slices and is in PWA/offline release hardening. The approved product direction is documented in [LifeIndex-Project-Baseline.md](LifeIndex-Project-Baseline.md), and live execution status is maintained in [PLAN.md](PLAN.md).

## V1 principles

- Local-first and offline-capable after the initial load
- Privacy-first, with no backend, account, analytics, or cloud database
- Versioned JSON backup and restore as a first-class capability
- Fast, calm, iPhone-focused daily interactions
- Modular foundations for future Journal, Writing, Timeline, and Insights work without implementing those modules in V1

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Use `pnpm quality` for the non-E2E local gate and `pnpm test:e2e` for the production-preview browser gate. See [DEV.md](docs/development/DEV.md) for environment, command, data-migration, and release details.

PWA installation behavior, controlled updates, offline guarantees, and the strict iOS Shortcut URL contract are documented in [PWA_AND_SHORTCUTS.md](docs/operations/PWA_AND_SHORTCUTS.md).

## Private data warning

Never commit a LifeIndex backup or real personal data. The repository stores application code and documentation only. GitHub Pages will host the static application shell; personal records remain in each browser's local IndexedDB storage.
