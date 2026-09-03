# LifeIndex V1 Delivery Plan

**Status:** Active
**Started:** 2026-09-03
**Current checkpoint:** M8 — local CI/deployment preparation; GitHub decisions and authentication pending
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

| ID  | Milestone                                 | Status      | Exit evidence                                                                          |
| --- | ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| M0  | Discovery, local Git, governance          | verified    | Inventory recorded, repository initialized, governance files committed                 |
| M1  | PRD, IA, UX direction, traceability       | verified    | Numbered V1 requirements and acceptance criteria reviewed for baseline consistency     |
| M2  | HLD, LLD, data model, backup schema, ADRs | verified    | Architecture and state transitions are implementation-ready                            |
| M3  | Engineering scaffold and DEV workflow     | verified    | Reproducible install, checks, build, local preview, and CI-ready scripts               |
| M4  | IndexedDB, migrations, backup/restore     | verified    | Migration and transactional backup round-trip tests pass                               |
| M5  | Finance, Habits, Focus, Today, Settings   | verified    | Each vertical slice passes its mapped unit, integration, and E2E checks                |
| M6  | PWA, offline, iPhone polish, URL Actions  | in_progress | Installability, offline app shell, update flow, and action safety verified             |
| M7  | Data-safety and release hardening         | verified    | Full local quality gate and production smoke suite pass                                |
| M8  | GitHub, CI, GitHub Pages                  | in_progress | User-approved remote exists; CI and deployment are green; live URL passes smoke checks |
| M9  | Physical iPhone acceptance and V1 release | todo        | User confirms checklist; final gate passes; `v1.0.0` and handoff complete              |

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
- [x] `verified` M0.5 Validate files, inspect the diff, and create the initial atomic commit.
  - Evidence: staged whitespace check passed; commit `f7303b4` created on `main`.

### M1 — Product design

- [x] `verified` M1.1 Write numbered functional and non-functional V1 requirements in `docs/product/PRD.md`.
  - Evidence: 53 unique functional/non-functional requirements with explicit acceptance criteria and release gates.
- [x] `verified` M1.2 Define navigation, user journeys, empty/error states, and iPhone interaction model.
  - Evidence: `docs/product/INFORMATION_ARCHITECTURE.md` defines all five destinations, routes, state flows, and interaction budgets.
- [x] `verified` M1.3 Define the calm, minimal visual system and accessibility expectations.
  - Evidence: `docs/design/UX_UI_GUIDE.md` covers layout, tokens, components, module behavior, accessibility, and visual review states.
- [x] `verified` M1.4 Establish requirement-to-design-to-code-to-test traceability and the initial risk register.
  - Evidence: traceability matrix covers every requirement group; risk register records 14 initial product, data, platform, security, and release risks.

### M2 — Architecture and detailed design

- [x] `verified` M2.1 Decide the frontend, storage wrapper, validation, PWA, state, routing, and test stack in bounded ADRs.
  - Evidence: ADR-0001 through ADR-0004 accept the stack, persistence, private actions, and deployment/update strategy with alternatives and sources.
- [x] `verified` M2.2 Write HLD diagrams, boundaries, data flows, privacy, logging, offline, deployment, and update architecture.
  - Evidence: `docs/architecture/HLD.md` contains context/container/deployment diagrams, startup/restore sequences, module boundaries, and failure/observability rules.
- [x] `verified` M2.3 Write LLD interfaces and Finance, Habit, Focus, restore, service-worker, and URL-action state transitions.
  - Evidence: `docs/architecture/LLD.md` defines source ownership, service/repository contracts, algorithms, state machine, logging allowlist, and test seams.
- [x] `verified` M2.4 Define IndexedDB schema v1, indexes, migrations, date/money semantics, and versioned backup schema.
  - Evidence: seven-store schema, referential rules, migrations, full backup envelope, validation pipeline, atomic replace, and compatibility policy are normative.

### M3 — Engineering scaffold

- [x] `verified` M3.1 Scaffold the selected TypeScript PWA without unrelated demo content.
  - Evidence: the React/Vite shell exposes the five approved hash routes, iPhone-first navigation, version metadata, and production PWA registration without implementing out-of-scope modules.
- [x] `verified` M3.2 Add formatting, lint, typecheck, unit/integration, build, preview, and E2E commands.
  - Evidence: peer validation, Prettier, ESLint, strict TypeScript, 6 Vitest checks, production build, and 4 Chromium/WebKit E2E checks pass on the pinned dependency graph.
- [x] `verified` M3.3 Add shared logging/error boundaries and verify logs exclude personal values.
  - Evidence: runtime context allowlisting, event-name rejection, message-free exception serialization, and four logger privacy tests guard the initial app/PWA failure paths.
- [x] `verified` M3.4 Document setup, directory ownership, code standards, migration, Git, release, and rollback workflows.
  - Evidence: `docs/development/DEV.md` and `docs/testing/TEST_PLAN.md` define reproducible commands and distinguish automated, deployed, and physical-iPhone proof.

### M4 — Data-safety foundation

- [x] `verified` M4.1 Implement IndexedDB schema v1, repositories, seed categories/settings, and migration framework.
  - Evidence: Dexie creates the seven normative stores/indexes, inserts 15 stable categories plus 3 typed settings idempotently, and exposes validated category/settings repository boundaries.
- [x] `verified` M4.2 Implement schema-validated, versioned JSON export and preview-first transactional restore.
  - Evidence: `BackupService` reads a consistent sorted snapshot, emits V1 JSON, accepts only validated previews, and replaces all seven stores in one transaction using a one-time in-memory token.
- [x] `verified` M4.3 Prove backup round trip, invalid-input preservation, rollback, and old-fixture migration.
  - Evidence: 10 integration checks cover schema/indexes, idempotent seeds, repositories, full round trip, malformed/oversized/count/reference rejection, forced rollback, V0 migration, and token consumption; all 36 Vitest checks pass.

### M5 — Core vertical slices

- [x] `verified` M5.1 Finance: transaction/category workflows, time filters, and scoped summaries.
  - Evidence: transaction create/edit/confirmed-delete, local Today/Week/Month/History filters, exact totals, monthly categories, six-month trend, reload persistence, and category create/rename/reorder/archive/restore pass repository checks plus Chromium/WebKit flows.
- [x] `verified` M5.2 Habits: lifecycle, daily check-in, calendar, streaks, and completion statistics.
  - Evidence: create/edit, daily/weekday plans, active/pause transitions, idempotent check-in/undo, current/longest streak, monthly rate/calendar, and history-preserving pause pass six focused tests plus Chromium/WebKit reload persistence.
- [x] `verified` M5.3 Focus: 25/50/custom timer, resilient timestamp state, session history, and summaries.
  - Evidence: transactional single-active start, timestamp-derived display, delayed natural reconciliation, early finish, sub-second/cancel removal, description-only edits, confirmed history deletion, local summaries, and category distribution pass seven focused tests plus Chromium/WebKit reload recovery.
- [x] `verified` M5.4 Today: date summary and high-frequency actions without dashboard overload.
  - Evidence: local date, one-tap habit check-in, two-tap Finance/Focus entry, independent module failure states, daily summaries, active Focus, midnight rollover, and cross-feature updates pass Chromium/WebKit production-preview flow.
- [x] `verified` M5.5 Settings: data management, categories/habits, appearance, backup status, and version information.
  - Evidence: immediate/persisted system-light-dark appearance, Finance category lifecycle, Habits management route, app/storage/privacy status, versioned browser export, safe preview, explicit replace confirmation, and restored appearance pass 58 Vitest checks plus 16 dual-engine E2E checks.

### M6 — PWA and iPhone experience

- [x] `verified` M6.1 Implement manifest, icons, standalone metadata, safe areas, mobile navigation, themes, and reduced motion.
  - Evidence: original production icon master plus 32/180/192/512/maskable outputs, complete manifest and Apple metadata, safe-area navigation, light/dark/system themes, and reduced-motion CSS pass root and synthetic `/LifeIndex/` builds.
- [x] `verified` M6.2 Implement offline app-shell caching and an explicit, recoverable update flow.
  - Evidence: custom precache contains only allowlisted static paths; real connectivity status uses a body-free same-origin HEAD probe; update activation requires a user click and is disabled while any registered form/backup draft is dirty.
- [x] `verified` M6.3 Implement validated, idempotent URL Actions using fragments by default; document any compatibility exception.
  - Evidence: all three action types strictly parse fragment-local fields, preview without writes, revalidate references, atomically write entity plus receipt, deduplicate, and scrub routes; 13 parser/service checks and dual-engine E2E flows pass.
- [ ] `in_progress` M6.4 Verify iPhone-sized input, touch, WebKit, offline, refresh, and update behavior.
  - Current evidence: Mobile Safari/WebKit passes navigation, CRUD, backup, manifest, all action flows, and offline mutation/persistence; Chromium passes full offline shell reload and mutation. Playwright WebKit raises an internal error on offline reload, so installed iPhone Safari airplane-mode reload and update activation remain an explicit M9 device gate.

### M7 — Hardening

- [x] `verified` M7.1 Cover migrations, restore failures, money/date boundaries, suspended timers, repeated actions, and corrupted data.
  - Evidence: 84 unit/integration tests include V0 migration, future/corrupt backup rejection with unchanged-data proof, restore rollback, exact money/calendar boundaries, timestamp reconciliation, action deduplication, and an injected IndexedDB failure that retains the draft.
- [x] `verified` M7.2 Exercise empty and representative larger datasets, accessibility, visual states, and production preview.
  - Evidence: 500 transactions round-trip exactly; 33/34 browser checks pass with one documented WebKit-tool skip; all primary/entry/dark states pass axe; 320 px touch/reduced-motion automation and 320 × 568 / 390 × 844 visual review pass.
- [x] `verified` M7.3 Run and record the complete local release gate.
  - Evidence: peers, formatting, lint, strict TypeScript, 18-file/84-test Vitest suite, root and `/LifeIndex/` production builds, dependency audit, secret/artifact/ignore scans, and 33-pass/1-skip dual-engine E2E gate are green on 2026-09-03.

### M8 — GitHub and deployment

- [ ] `in_progress` M8.1 Confirm owner, repository name, visibility, licensing intent, and acceptance of the Pages access model in one request.
- [ ] `todo` M8.2 Create/configure the remote and push only reviewed source and documentation.
- [ ] `in_progress` M8.3 Configure least-privilege CI and Pages deployment gated by successful checks.
  - Local evidence: current official action contracts were reviewed; CI is content-read-only, Pages grants write/OIDC only to the dependent deploy job, frozen install/full quality/dual-engine gates precede artifact upload, and the configured Pages base path drives the final build. Remote execution remains pending.
- [ ] `todo` M8.4 Inspect workflow evidence and validate the live subpath, assets, manifest, worker, console, mobile view, and offline reload.

### M9 — Physical iPhone and release

- [ ] `todo` M9.1 Guide the user through install, standalone launch, CRUD persistence, airplane-mode use, and update checks.
- [ ] `todo` M9.2 Guide a test-data-only Files/iCloud export and restore round trip plus valid/invalid URL Actions.
- [ ] `todo` M9.3 Fix observed defects and repeat affected checks until the user confirms acceptance.
- [ ] `todo` M9.4 Update final documentation, run the full gate, ensure a clean worktree, push, tag `v1.0.0`, and prepare release handoff.

## Risks and blockers

| ID    | Risk or blocker                                                                   | Impact                               | Mitigation / trigger                                                                      |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| R-001 | Safari may remove site data after user action, uninstall, or storage pressure     | Loss of long-lived records           | First-class backups, clear warnings, restore tests, and recurring backup guidance         |
| R-002 | GitHub Pages project subpaths can break routes, manifest, or service-worker scope | Installed/offline app fails          | Base-path-aware build plus deployed manifest/worker smoke tests                           |
| R-003 | URL query actions can leak sensitive values to the host/history                   | Privacy breach                       | Prefer fragments; validate, deduplicate, scrub, and document any exception                |
| R-004 | iOS suspends timers and JavaScript callbacks in the background                    | Incorrect focus duration             | Derive elapsed time from persisted timestamps and test resume/reload transitions          |
| R-005 | Static Pages has no authentication                                                | App shell is accessible by URL       | Confirm this model before remote deployment; keep all records local and ship no user data |
| R-006 | GitHub CLI is installed but not authenticated                                     | M8 remote work blocked               | Complete all local milestones first; request one account/visibility confirmation at M8    |
| R-007 | Physical iPhone cannot be operated by the agent                                   | Final acceptance cannot be automated | Provide one concise test action at a time and require user confirmation before release    |

## Decisions

- No architecture decisions are final until their ADR is written in M2.
- The baseline architecture and product non-goals are already approved and do not require a new ADR.

## Recently completed

- Read the complete baseline and confirmed a greenfield repository.
- Established the long-running delivery goal.
- Inspected the initial local toolchain and GitHub authentication state.
- Initialized the repository on `main`.
- Added the initial privacy-safe governance and planning files.
- Completed M0 in local commit `f7303b4` and began translating the product baseline into testable M1 requirements.
- Verified M1 with 53 unique requirements, complete interaction/visual direction, traceability coverage, and 14 registered risks.
- Began M2 with four bounded decisions covering the web stack, IndexedDB/validation, private URL Actions, and controlled PWA deployment.
- Verified M2 with four accepted ADRs and implementation-ready architecture, data, backup, timer, action, logging, and PWA contracts.
- Locked the M3 dependency graph after resolving a TypeScript 7 peer conflict by selecting compatible TypeScript 6.0.3.
- Verified M3: the five-route app shell, safe logger, error boundary, custom service worker build, local workflows, and Chromium/WebKit accessibility smoke tests all pass.
- Verified M4: the seven-store IndexedDB foundation and preview-first atomic backup replacement pass static, 36-test, production-build, and two-engine browser gates.
- Implemented the Finance transaction slice against real IndexedDB with exact projections and a production-preview CRUD/reload journey in both browser engines.
- Verified the Habits slice with schedule-aware statistics, reversible compound-key check-ins, pause-with-history semantics, monthly progress UI, and dual-engine persistence evidence.
- Verified the Focus slice with timestamp-derived countdown, single-active transactional transitions, reload recovery, history maintenance, and dual-engine early-finish evidence.
- Verified Today as a calm projection-only surface with independent Finance/Habits/Focus subscriptions and dual-engine cross-feature evidence.
- Verified Settings and completed M5 with persisted appearance, Finance category lifecycle, transparent local-storage status, and browser backup/preview/atomic replace flows; the complete gate passes 58 Vitest checks and 16 Chromium/WebKit E2E checks.
- Split feature routes into lazy production chunks, reducing the main JavaScript chunk from the warning threshold to about 339 kB before gzip.
- Implemented M6 installability and controlled update infrastructure with an original PWA icon set, base-path-safe metadata, static-only precaching, trustworthy offline status, and shared dirty-form protection.
- Implemented all three strict fragment URL Actions with no-write previews, atomic receipt coordination, retry deduplication, safe route scrubbing, and an iOS Shortcuts operations contract.
- Closed the automated M6 gate with 75/75 Vitest checks and 25 passed / 1 documented WebKit-tool skip across 26 production-preview E2E scenarios; Chromium passes the complete offline reload path.
- Completed M7 hardening with 84/84 Vitest checks, 33 passed / 1 documented WebKit-tool skip across 34 production-preview E2E scenarios, zero known production dependency vulnerabilities, privacy-safe artifacts, and verified root/project-path builds.
- Found and fixed dark-theme primary-control contrast plus compact touch-target gaps during the M7 accessibility pass.

## Next three actions

1. Add least-privilege GitHub CI/Pages workflows and release/runbook documentation without creating a remote yet.
2. Validate and commit the local workflow/runbook preparation.
3. Ask once for GitHub owner/name/visibility/license/Pages approval and authentication, then create and verify the remote deployment.

## Plan change log

| Date       | Change                                                                                                                   | Reason and impact                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Created the first executable V1 plan and milestone evidence model.                                                       | Converts the approved baseline into a living delivery contract; no product-scope change.                                                                          |
| 2026-09-03 | Recorded fragment-based URL Actions as the default design direction.                                                     | Protects privacy by keeping action payloads out of HTTP requests; requires ADR validation in M2.                                                                  |
| 2026-09-03 | Defined V1 habit schedules as daily or selected weekdays and restore as preview-first replace, not merge.                | Satisfies the baseline with testable, data-safe scope while deferring ambiguous scheduling and merge conflict rules.                                              |
| 2026-09-03 | Defined Focus V1 without pause/resume intervals.                                                                         | Keeps timestamp recovery reliable and avoids turning Focus into project management; early finish and cancel remain supported.                                     |
| 2026-09-03 | Accepted React/TypeScript/Vite, pnpm, Dexie 4, Zod, hash routing, custom Workbox service worker, Vitest, and Playwright. | Provides a typed static PWA, Safari-aware data layer, explicit update control, and layered validation without a backend or heavyweight global state/UI framework. |
| 2026-09-03 | Added `actionReceipts` as the seventh V1 store.                                                                          | Durable idempotency is necessary to prevent Shortcuts retries from duplicating records; receipts contain no payload and are included in full backup.              |
| 2026-09-03 | Pinned TypeScript 6.0.3 instead of the available 7.0.2.                                                                  | `typescript-eslint` 8.69.0 requires TypeScript below 6.1; resolving the peer contract keeps lint/type evidence trustworthy.                                       |
| 2026-09-03 | Completed M3 with a production-built PWA shell and two-engine browser gate.                                              | Establishes a reproducible implementation loop before persisted data is introduced; WebKit remains an approximation until physical-iPhone acceptance.            |
| 2026-09-03 | Added a supported V0-to-V1 backup migration that initializes empty action receipts.                                   | Gives the migration pipeline a real older fixture without inventing business data; V1 remains the only emitted format.                                           |
| 2026-09-03 | Completed M4 with a seven-store atomic replace-restore boundary.                                                       | Data is fully validated before writes and any insertion failure rolls the whole replacement back, establishing the safety base for feature development.           |
| 2026-09-03 | Completed all five M5 vertical slices and introduced route-level lazy loading.                                          | Settings closes category and backup handoff workflows; 58 unit/integration checks and 16 dual-engine E2E checks pass while the production main chunk stays bounded. |
| 2026-09-03 | Completed M6 implementation while deferring one WebKit automation gap to physical acceptance.                           | Install metadata, offline mutation, update safety, and URL Actions are automated; Playwright WebKit cannot perform offline reload, so M9 retains the real-device release gate. |
| 2026-09-03 | Completed M7 local release hardening and advanced the checkpoint to M8.                                                  | Corruption, failure, volume, privacy, accessibility, compact-layout, dependency, root/subpath build, and dual-engine gates pass; only deployed and physical-device evidence remains. |
