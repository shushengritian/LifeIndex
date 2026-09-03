# LifeIndex

> Index your life.

LifeIndex is a local-first personal life index for iPhone. The V1 progressive web app records finances, focus sessions, and habits while keeping the primary data in the device's IndexedDB database.

## Project status

LifeIndex is under active V1 development. The approved product direction is documented in [LifeIndex-Project-Baseline.md](LifeIndex-Project-Baseline.md), and live execution status is maintained in [PLAN.md](PLAN.md).

## V1 principles

- Local-first and offline-capable after the initial load
- Privacy-first, with no backend, account, analytics, or cloud database
- Versioned JSON backup and restore as a first-class capability
- Fast, calm, iPhone-focused daily interactions
- Modular foundations for future Journal, Writing, Timeline, and Insights work without implementing those modules in V1

## Development

The application scaffold and verified development commands will be added in milestone M3. Until then, do not infer setup commands from this placeholder; follow the evidence recorded in `PLAN.md`.

## Private data warning

Never commit a LifeIndex backup or real personal data. The repository stores application code and documentation only. GitHub Pages will host the static application shell; personal records remain in each browser's local IndexedDB storage.
