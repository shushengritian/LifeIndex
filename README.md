# LifeIndex

> Index your life.

LifeIndex is a local-first personal life index for iPhone. The V1 progressive web app records finances, focus sessions, and habits while keeping the primary data in the device's IndexedDB database.

## Project status

LifeIndex [v1.0.0 is released](https://github.com/shushengritian/LifeIndex/releases/tag/v1.0.0) and [live on GitHub Pages](https://shushengritian.github.io/LifeIndex/), with successful automated quality and live deployment checks. The owner confirmed phone-browser opening and explicitly accepted V1 with remaining physical-iPhone checks deferred under [ADR-0005](docs/adr/0005-v1-owner-acceptance.md). Deferred checks are not passed tests. See the [release handoff and verification limits](docs/releases/v1.0.0.md), [follow-up register](docs/project/POST_V1_BACKLOG.md), and [archived delivery plan](PLAN.md).

To install, open the live URL in iPhone Safari, choose **Share → Add to Home Screen**, and leave **Open as Web App** enabled if shown. Start from the Home Screen icon and use synthetic data until the [physical acceptance checklist](docs/operations/IPHONE_ACCEPTANCE.md) is complete. No App Store or Apple Developer account is needed.

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

GitHub CI/Pages behavior and rollback are documented in [DEPLOYMENT.md](docs/operations/DEPLOYMENT.md). The deferred real-device checklist remains separate in [IPHONE_ACCEPTANCE.md](docs/operations/IPHONE_ACCEPTANCE.md), so automated WebKit checks and owner acceptance cannot be mistaken for physical test results.

## Private data warning

Never commit a LifeIndex backup or real personal data. The repository stores application code and documentation only. GitHub Pages will host the static application shell; personal records remain in each browser's local IndexedDB storage.
