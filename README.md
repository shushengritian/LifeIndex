# LifeIndex

> Index your life.

LifeIndex is a local-first personal life index for iPhone. The V2 progressive web app combines Finance, Focus, and lightweight Health—manual weight, activity, and habits—while keeping primary data in the device's IndexedDB database.

## Project status

LifeIndex [v1.0.0 is the latest tagged release](https://github.com/shushengritian/LifeIndex/releases/tag/v1.0.0) and remains the production baseline on [GitHub Pages](https://shushengritian.github.io/LifeIndex/) until the V2 candidate is deployed. V2 implementation and local automated gates are complete; remote deployment and owner-led iPhone upgrade acceptance remain before the `v2.0.0` tag. Follow progress in [V2_PLAN.md](V2_PLAN.md) and use the [V2 iPhone acceptance checklist](docs/operations/IPHONE_ACCEPTANCE.md).

To install, open the live URL in iPhone Safari, choose **Share → Add to Home Screen**, and leave **Open as Web App** enabled if shown. Start from the Home Screen icon and use synthetic data until the [physical acceptance checklist](docs/operations/IPHONE_ACCEPTANCE.md) is complete. No App Store or Apple Developer account is needed.

## Product principles

- Local-first and offline-capable after the initial load
- Privacy-first, with no backend, account, analytics, or cloud database
- Versioned JSON backup and restore as a first-class capability
- Fast, calm, iPhone-focused daily interactions
- Lightweight scope: no account, calorie tracker, workout program, payment scraping, or cloud synchronization

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Use `pnpm quality` for the non-E2E local gate and `pnpm test:e2e` for the production-preview browser gate. See [DEV.md](docs/development/DEV.md) for environment, command, data-migration, and release details.

PWA installation behavior, controlled updates, offline guarantees, and the strict iOS Shortcut URL contract are documented in [PWA_AND_SHORTCUTS.md](docs/operations/PWA_AND_SHORTCUTS.md).

GitHub CI/Pages behavior and rollback are documented in [DEPLOYMENT.md](docs/operations/DEPLOYMENT.md). The deferred real-device checklist remains separate in [IPHONE_ACCEPTANCE.md](docs/operations/IPHONE_ACCEPTANCE.md), so automated WebKit checks and owner acceptance cannot be mistaken for physical test results.

## Private data warning

Never commit a LifeIndex backup or real personal data. The repository stores application code and documentation only. GitHub Pages will host the static application shell; personal records remain in each browser's local IndexedDB storage.
