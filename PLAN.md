# LifeIndex V1 Delivery Plan

**Status:** Active
**Started:** 2026-09-03
**Current checkpoint:** M0 — validate and commit repository governance
**Source of truth:** `LifeIndex-Project-Baseline.md`

## Objective

Deliver a tested, documented, local-first LifeIndex V1 as an installable iPhone PWA, deploy its static application shell through GitHub Pages, and complete a user-confirmed physical-iPhone acceptance pass before tagging `v1.0.0`.

## Definition of Done

The goal is complete only when all of the following are verified:

- The local Git repository has an understandable, reviewable history and a clean worktree.
- PRD, information architecture, UX/UI, HLD, LLD, data model, backup schema, DEV, test, deployment, iPhone installation, recovery, and troubleshooting documents match the implementation.
- Finance, Habits, Focus, Today, Settings, IndexedDB persistence, migration, backup/restore, offline app shell, and safe URL Actions meet their acceptance criteria.
- Formatting, linting, type checking, automated tests, production build, mobile WebKit E2E checks, and deployed smoke checks pass.
- The approved GitHub repository, CI workflow, and GitHub Pages deployment are live.
- The user confirms installation, persistence, offline use, and backup/restore on their physical iPhone.
- Final documents, changelog, traceability evidence, tag `v1.0.0`, and release handoff are complete.

## Baseline and current assumptions

- The repository began with one 523-line baseline document and no Git metadata or application code.
- The product is a PWA for iPhone Safari/Home Screen, not a native SwiftUI app.
- IndexedDB is the sole primary data store. No backend, login, sync, analytics, or external telemetry is allowed in V1.
- GitHub Pages will host only the static app shell. Its public-access implications must be confirmed before remote creation.
- Physical-device actions require user participation and cannot be substituted with simulator or desktop browser results.
- Initial technical candidate: React + TypeScript + Vite, Dexie, Zod, a Workbox-backed PWA integration, Vitest, and Playwright. M2 ADRs will confirm or adjust this after a bounded comparison.
- Default user-facing language is Chinese while the product name remains `LifeIndex`. Locale, currency, minimum iOS version, and GitHub visibility will be made explicit in product/architecture decisions.

## Milestones

| ID | Milestone | Status | Exit evidence |
| --- | --- | --- | --- |
| M0 | Discovery, local Git, governance | in_progress | Inventory recorded, repository initialized, governance files committed |
| M1 | PRD, IA, UX direction, traceability | todo | Numbered V1 requirements and acceptance criteria reviewed for baseline consistency |
| M2 | HLD, LLD, data model, backup schema, ADRs | todo | Architecture and state transitions are implementation-ready |
| M3 | Engineering scaffold and DEV workflow | todo | Reproducible install, checks, build, local preview, and CI-ready scripts |
| M4 | IndexedDB, migrations, backup/restore | todo | Migration and transactional backup round-trip tests pass |
| M5 | Finance, Habits, Focus, Today, Settings | todo | Each vertical slice passes its mapped unit, integration, and E2E checks |
| M6 | PWA, offline, iPhone polish, URL Actions | todo | Installability, offline app shell, update flow, and action safety verified |
| M7 | Data-safety and release hardening | todo | Full local quality gate and production smoke suite pass |
| M8 | GitHub, CI, GitHub Pages | todo | User-approved remote exists; CI and deployment are green; live URL passes smoke checks |
| M9 | Physical iPhone acceptance and V1 release | todo | User confirms checklist; final gate passes; `v1.0.0` and handoff complete |

## Work breakdown

### M0 — Discovery, local Git, governance

- [x] `verified` M0.1 Read the complete product baseline and inventory workspace files.
  - Evidence: one baseline file, 523 lines, 11,006 bytes; no project-level config or AGENTS file existed.
- [x] `verified` M0.2 Inspect the initial toolchain.
  - Evidence: Git 2.39.5, Node 20.19.5, npm 10.8.2, pnpm 11.19.0; Yarn and Bun absent.
- [x] `verified` M0.3 Initialize a local Git repository on `main`.
  - Evidence: `git init -b main` completed on 2026-09-03.
- [x] `verified` M0.4 Add privacy-safe ignore rules, repository guidance, living plan, contribution and security policies.
  - Evidence: `.gitignore`, `.editorconfig`, `AGENTS.md`, `README.md`, `PLAN.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `SECURITY.md` are present and populated.
- [ ] `in_progress` M0.5 Validate files, inspect the diff, and create the initial atomic commit.

### M1 — Product design

- [ ] `todo` M1.1 Write numbered functional and non-functional V1 requirements in `docs/product/PRD.md`.
- [ ] `todo` M1.2 Define navigation, user journeys, empty/error states, and iPhone interaction model.
- [ ] `todo` M1.3 Define the calm, minimal visual system and accessibility expectations.
- [ ] `todo` M1.4 Establish requirement-to-design-to-code-to-test traceability and the initial risk register.

### M2 — Architecture and detailed design

- [ ] `todo` M2.1 Decide the frontend, storage wrapper, validation, PWA, state, routing, and test stack in bounded ADRs.
- [ ] `todo` M2.2 Write HLD diagrams, boundaries, data flows, privacy, logging, offline, deployment, and update architecture.
- [ ] `todo` M2.3 Write LLD interfaces and Finance, Habit, Focus, restore, service-worker, and URL-action state transitions.
- [ ] `todo` M2.4 Define IndexedDB schema v1, indexes, migrations, date/money semantics, and versioned backup schema.

### M3 — Engineering scaffold

- [ ] `todo` M3.1 Scaffold the selected TypeScript PWA without unrelated demo content.
- [ ] `todo` M3.2 Add formatting, lint, typecheck, unit/integration, build, preview, and E2E commands.
- [ ] `todo` M3.3 Add shared logging/error boundaries and verify logs exclude personal values.
- [ ] `todo` M3.4 Document setup, directory ownership, code standards, migration, Git, release, and rollback workflows.

### M4 — Data-safety foundation

- [ ] `todo` M4.1 Implement IndexedDB schema v1, repositories, seed categories/settings, and migration framework.
- [ ] `todo` M4.2 Implement schema-validated, versioned JSON export and preview-first transactional restore.
- [ ] `todo` M4.3 Prove backup round trip, invalid-input preservation, rollback, and old-fixture migration.

### M5 — Core vertical slices

- [ ] `todo` M5.1 Finance: transaction/category workflows, time filters, and scoped summaries.
- [ ] `todo` M5.2 Habits: lifecycle, daily check-in, calendar, streaks, and completion statistics.
- [ ] `todo` M5.3 Focus: 25/50/custom timer, resilient timestamp state, session history, and summaries.
- [ ] `todo` M5.4 Today: date summary and high-frequency actions without dashboard overload.
- [ ] `todo` M5.5 Settings: data management, categories/habits, appearance, backup status, and version information.

### M6 — PWA and iPhone experience

- [ ] `todo` M6.1 Implement manifest, icons, standalone metadata, safe areas, mobile navigation, themes, and reduced motion.
- [ ] `todo` M6.2 Implement offline app-shell caching and an explicit, recoverable update flow.
- [ ] `todo` M6.3 Implement validated, idempotent URL Actions using fragments by default; document any compatibility exception.
- [ ] `todo` M6.4 Verify iPhone-sized input, touch, WebKit, offline, refresh, and update behavior.

### M7 — Hardening

- [ ] `todo` M7.1 Cover migrations, restore failures, money/date boundaries, suspended timers, repeated actions, and corrupted data.
- [ ] `todo` M7.2 Exercise empty and representative larger datasets, accessibility, visual states, and production preview.
- [ ] `todo` M7.3 Run and record the complete local release gate.

### M8 — GitHub and deployment

- [ ] `todo` M8.1 Confirm owner, repository name, visibility, licensing intent, and acceptance of the Pages access model in one request.
- [ ] `todo` M8.2 Create/configure the remote and push only reviewed source and documentation.
- [ ] `todo` M8.3 Configure least-privilege CI and Pages deployment gated by successful checks.
- [ ] `todo` M8.4 Inspect workflow evidence and validate the live subpath, assets, manifest, worker, console, mobile view, and offline reload.

### M9 — Physical iPhone and release

- [ ] `todo` M9.1 Guide the user through install, standalone launch, CRUD persistence, airplane-mode use, and update checks.
- [ ] `todo` M9.2 Guide a test-data-only Files/iCloud export and restore round trip plus valid/invalid URL Actions.
- [ ] `todo` M9.3 Fix observed defects and repeat affected checks until the user confirms acceptance.
- [ ] `todo` M9.4 Update final documentation, run the full gate, ensure a clean worktree, push, tag `v1.0.0`, and prepare release handoff.

## Risks and blockers

| ID | Risk or blocker | Impact | Mitigation / trigger |
| --- | --- | --- | --- |
| R-001 | Safari may remove site data after user action, uninstall, or storage pressure | Loss of long-lived records | First-class backups, clear warnings, restore tests, and recurring backup guidance |
| R-002 | GitHub Pages project subpaths can break routes, manifest, or service-worker scope | Installed/offline app fails | Base-path-aware build plus deployed manifest/worker smoke tests |
| R-003 | URL query actions can leak sensitive values to the host/history | Privacy breach | Prefer fragments; validate, deduplicate, scrub, and document any exception |
| R-004 | iOS suspends timers and JavaScript callbacks in the background | Incorrect focus duration | Derive elapsed time from persisted timestamps and test resume/reload transitions |
| R-005 | Static Pages has no authentication | App shell is accessible by URL | Confirm this model before remote deployment; keep all records local and ship no user data |
| R-006 | GitHub CLI is installed but not authenticated | M8 remote work blocked | Complete all local milestones first; request one account/visibility confirmation at M8 |
| R-007 | Physical iPhone cannot be operated by the agent | Final acceptance cannot be automated | Provide one concise test action at a time and require user confirmation before release |

## Decisions

- No architecture decisions are final until their ADR is written in M2.
- The baseline architecture and product non-goals are already approved and do not require a new ADR.

## Recently completed

- Read the complete baseline and confirmed a greenfield repository.
- Established the long-running delivery goal.
- Inspected the initial local toolchain and GitHub authentication state.
- Initialized the repository on `main`.
- Added the initial privacy-safe governance and planning files.

## Next three actions

1. Finish and validate the M0 governance files.
2. Create the initial atomic Git commit.
3. Draft M1 PRD, information architecture, UX/UI guide, traceability matrix, and risk register.

## Plan change log

| Date | Change | Reason and impact |
| --- | --- | --- |
| 2026-09-03 | Created the first executable V1 plan and milestone evidence model. | Converts the approved baseline into a living delivery contract; no product-scope change. |
| 2026-09-03 | Recorded fragment-based URL Actions as the default design direction. | Protects privacy by keeping action payloads out of HTTP requests; requires ADR validation in M2. |
