# Changelog

All notable LifeIndex changes will be documented here. The project follows Semantic Versioning once the first release candidate is created.

## [Unreleased]

No post-V1 feature work is authorized yet.

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
