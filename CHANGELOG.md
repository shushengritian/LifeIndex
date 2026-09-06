# Changelog

All notable LifeIndex changes will be documented here. The project follows Semantic Versioning once the first release candidate is created.

## [Unreleased]

### Added

- A lightweight Health destination combining manual weight, activity, and the retained Habit workflows without adding calorie, medical, workout-plan, wearable, or cloud features.
- Additive IndexedDB schema V2 stores for Weight and Activity, six stable Activity categories, optional local weight target, and strict repositories/validation.
- Backup format V2 across nine stores, with frozen V0/V1 in-memory migration, complete pre-write validation, and atomic replacement rollback.
- A selectable Monday-first Finance month calendar with per-day net amounts, compact month totals, selected-day ledger, and mobile quick-entry sheet.
- Fourteen-week Habit heatmap, current/longest streak, monthly completion, totals, and recent check-ins inside Health.
- Shared line icons, compact contextual header, reusable modal sheet, and complete responsive light/dark visual system.

### Changed

- Bottom navigation is now Today, Finance, Focus, Health, and Settings; legacy Habit bookmarks redirect to Health.
- Settings now exposes Categories, Appearance, Data & security, and Other as four independent groups.
- Category management stays in its independent Settings group but its detailed editor is collapsed by default behind an explicit disclosure.
- Today prioritizes Health habits and the two direct Finance/Focus actions; Focus uses a timer-led presentation while retaining its timestamp state machine.

### Fixed

- Finance and Health circular add controls now use an optically centered geometric icon, including icon-only Weight and Activity card shortcuts with accessible names.
- Native date/time controls now fill the same form-column width as adjacent inputs on iOS.

### Verification

- A real synthetic schema-V1 database upgrades in place with every old row preserved and both Health stores initially empty.
- The first candidate passed static checks, 22 files / 125 Vitest tests, dual-engine production E2E, accessibility, offline, privacy, 320/390 responsive checks, and GitHub Pages live smoke. Physical-iPhone review then identified four presentation corrections; their complete local gate now passes 125 Vitest tests, 37 browser scenarios / 1 documented skip, and 11 `/LifeIndex/` smoke scenarios / 1 matching skip. Branch CI, redeployment, and final owner retest remain pending.

## [1.0.0] - 2026-09-04

### Release acceptance

- Owner accepted the current V1 delivery and explicitly deferred unfinished physical-iPhone checks under ADR-0005. Phone-browser opening is confirmed; full device acceptance is not claimed.
- Promoted application metadata from 0.1.1 to 1.0.0 without changing business logic, dependencies, database schema V1, or backup format V1.
- Archived release guidance and named follow-ups; retained every automated release gate and the documented WebKit offline-reload skip.

### Fixed

- Replaced the unresolved sharp install-script approval with a reviewed exact-version allowance while keeping strict dependency-build checks enabled for clean CI installs.
- Version 0.1.1 discovers installed-app updates on foreground/reconnect with in-flight protection, a short successful-check cooldown, and recoverable failure handling; activation remains explicit and dirty-form-safe.

### Added

- Product baseline and long-running V1 delivery plan.
- Local repository governance, privacy, contribution, and security guidance.
- Numbered V1 product requirements, information architecture, UX/UI direction, requirement traceability, and risk register.
- Accepted architecture decisions for the TypeScript/React/Vite stack, Dexie persistence, private hash actions, and custom PWA deployment.
- Implementation-ready HLD, LLD, IndexedDB data model, and versioned backup contract.
- Reproducible pnpm toolchain, React/Vite app shell, privacy-safe logger, custom service worker scaffold, and layered test configuration.
- Development and test guides with local, browser, deployed, and physical-iPhone evidence boundaries.
- Seven-store Dexie schema, idempotent default categories/settings, typed validation, exact money/local-date utilities, and foundational repositories.
- Deterministic V1 JSON snapshots, supported V0 migration, preview-only inspection, one-time restore tokens, referential checks, and transactional seven-store replacement.
- Finance transaction creation, editing, confirmed deletion, local period filters, exact summaries, monthly category breakdown, and restrained six-month trend.
- Habit creation/editing, daily and weekday schedules, direct idempotent check-in/undo, pause/resume with retained history, schedule-aware streaks, monthly rate, and calendar progress.
- Focus presets/custom duration, single-active persisted timer, reload-safe timestamp reconciliation, natural/early completion, cancellation, editable history, and local period/category summaries.
- Calm Today aggregation with local-date rollover, direct habit check-in, fast Finance/Focus entry, active Focus state, and independent module failure handling.
- Settings workflows for persisted appearance, Finance category creation/rename/reorder/archive/restore, Habits management, app/storage/privacy status, and browser backup export/preview/replace.
- Route-level lazy loading for bounded production JavaScript chunks.
- Original LifeIndex Home Screen/PWA icon set, complete manifest metadata, base-path-safe Apple touch icon, explicit offline/cache status, and a user-controlled update prompt protected by shared dirty-form tracking.
- Preview-first fragment URL Actions for adding transactions, checking habits, and starting Focus, with strict parsing, atomic entity-plus-receipt writes, durable deduplication, and fragment cleanup.
- M7 release hardening for corrupted/future backups, 500-record recovery, injected storage failure, network/log privacy, 320 px touch layout, reduced motion, full-route accessibility, dark-theme contrast, and root/subpath production builds.
- Least-privilege GitHub CI/Pages workflows plus deployment, rollback, live-smoke, and physical-iPhone acceptance runbooks.
- Post-deployment Chromium/WebKit smoke automation for the live Pages base path, assets, manifest/worker scope, routes, local persistence, fragment privacy, and offline behavior.
