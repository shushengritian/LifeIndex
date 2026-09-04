# LifeIndex V1 Test Plan

**Status:** Active

**Last updated:** 2026-09-03

## 1. Quality objective

Prove that LifeIndex preserves private local data and core daily workflows across normal use, validation failures, iOS-style suspension/reload, offline operation, upgrades, and backup recovery.

Automation is evidence, not a substitute for physical-iPhone acceptance.

## 2. Test layers

| Layer                         | Tool/environment                 | Primary proof                                                                       |
| ----------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| Static                        | Prettier, ESLint, TypeScript     | Formatting, unsafe patterns, strict contracts                                       |
| Unit                          | Vitest + jsdom                   | Money/date/schedule/streak/statistics/state-machine/schema logic and components     |
| Integration                   | Vitest + fake-indexeddb          | Dexie indexes, repositories, transactions, migrations, restore rollback             |
| Browser E2E                   | Playwright Chromium              | Fast end-to-end workflow and offline/service-worker feedback                        |
| Primary-browser approximation | Playwright Mobile Safari/WebKit  | Touch viewport, WebKit behavior, navigation, IndexedDB and worker scenarios         |
| Deployed smoke                | Real Pages HTTPS URL             | Base path, manifest, worker scope, reload, assets, offline artifact                 |
| Physical acceptance           | User's iPhone Safari/Home Screen | Actual install, persistence, suspension, Files/iCloud export/restore, airplane mode |

## 3. M3 scaffold gate

- Verified 2026-09-03: dependency peer check has no issue.
- Verified: app shell unit tests cover default Today and all five destinations.
- Verified: safe logger tests prove allowlisted context and reject sensitive keys/messages.
- Verified: production build emits HTML, versioned assets, manifest, and service worker.
- Verified: four E2E checks load the production preview in Chromium and Mobile Safari/WebKit.
- Verified: automated accessibility scans report no shell violation in either engine.

## 4. M4 data-safety matrix

- Verified: fresh database creates exactly seven V1 stores, 15 stable categories, and 3 typed settings; reopening is idempotent.
- Verified: category/settings repository success, idempotent, validation, and failure paths emit safe event metadata.
- Verified: transaction amounts remain exact at minimum, decimal, maximum, sum, and invalid boundaries.
- Verified: local date keys handle month/year/leap-day and calendar-component iteration.
- Verified: backup round trip reproduces every canonical store logically.
- Verified: invalid JSON, oversized input, unsupported future version, count mismatch, invalid fields, duplicate primary/compound keys, dangling entity/action references, and multiple active Focus records start no write and retain current data.
- Verified: a forced insertion failure during replace aborts all store changes.
- Verified: supported V0 backup fixture migrates deterministically and preview tokens are cancelable/one-time.

## 5. M5 feature matrix

### Finance

- Verified: expense/income create, edit, confirm-delete, and production-preview reload persistence.
- Verified: category type/reference, archived category history, and selected-period boundaries.
- Verified: exact income/expense/balance/category/trend totals and zero-filled six-month trend.
- Verified: an injected IndexedDB write failure preserves the visible Finance draft and commits no partial record.
- Verified: a representative 500-transaction snapshot restores with stable ordering, count, and exact total.

### Habits

- Verified: daily and selected-weekday schedules from start date.
- Verified: idempotent check-in and undo using the unique compound key.
- Verified: pause removes current prompts while preserving history and can be reversed.
- Verified: current/longest streak, month rate, total count, unscheduled dates, and unfinished today.
- Verified: current-month calendar states and dual-engine create/check/reload/undo journey; broader accessibility states remain in M7.

### Focus

- Verified: 25/50/custom bounds and required title.
- Verified: transactional single-active invariant.
- Verified: timestamp-derived display, reload resume, and delayed natural completion at the planned endpoint.
- Verified: early finish, confirm-cancel behavior, sub-second cancellation, and repeated-transition idempotency.
- Verified: Today/week/month/category summaries plus description-only history edits and confirmed deletion.

### Today and Settings

- Verified: Today projections update after Finance/Habit/Focus mutations and model each read failure independently rather than substituting zero.
- Verified: one-tap Today habit check-in and two-tap form entry budgets for Finance/Focus.
- Verified: system/light/dark appearance applies immediately, persists, and is restored from a replacement backup.
- Verified: category create/rename/reorder/archive/restore and the Habits management route remain usable in both engines.
- Verified: backup handoff, non-mutating metadata preview, explicit replacement, version/database details, last-export status, and durability/privacy text.
- Physical-iPhone pending: real Files/iCloud save, selection, and restore handoff; desktop WebKit uses a same-origin synthetic file because Playwright WebKit does not expose a download event.

### M5 recorded gate

- Static: Prettier, ESLint with zero warnings, and strict TypeScript pass.
- Unit/integration: 14 files and 58 tests pass.
- Production: Vite/PWA build passes with route-level chunks; main JavaScript is about 339 kB before gzip.
- Browser: 16/16 tests pass across Chromium and Mobile Safari/WebKit.

## 6. M6 PWA and URL Action matrix

- Verified: manifest required fields, original 192/512/maskable icons, Apple touch icon, start URL, scope, colors, and standalone metadata under `/` and synthetic `/LifeIndex/` builds.
- Verified: Chromium performs initial online control, offline launch/reload/mutation, another offline reload, and persisted read.
- Verified: Mobile Safari/WebKit mutates while offline and retains data after returning online; its Playwright offline reload raises an internal engine error, so installed iPhone reload remains M9 evidence.
- Verified: Cache Storage entries are same-origin HTML/manifest/icon/versioned asset paths only, with no action fragment, API, or business-record request.
- Verified: waiting-worker UI requires an explicit click, dirty forms disable activation, application failures remain retryable, and active Focus state is persisted independently.
- Verified: action routes exist only after `#`; invalid, canceled, handled, and completed actions replace the current route to remove active fields.
- Verified: each action rejects unknown/duplicate/malformed fields, previews without mutation, revalidates references, writes entity+receipt atomically, clears the route, and deduplicates retry.
- Recorded M6 pre-hardening gate: 17 Vitest files / 75 tests pass; browser suite records 25 passed and 1 explicitly skipped WebKit-offline-reload scenario out of 26, with Chromium 13/13 and every runnable Mobile Safari/WebKit scenario green.

## 7. M7 hardening gate

- Static and supply chain: peer dependencies, Prettier, ESLint with zero warnings, strict TypeScript, tracked-file credential scan, backup ignore rules, and `pnpm audit --prod` pass with no known production vulnerability.
- Unit/integration: 18 files and 84 tests pass, including malformed/future/corrupted backup matrices, transactional rollback, storage-failure draft retention, calendar and money boundaries, suspended Focus reconciliation, and repeated action idempotency.
- Production: root and synthetic `/LifeIndex/` builds pass; the latter emits matching HTML resources, manifest start URL/scope/id, and worker precache paths. No source map or backup-like JSON is shipped.
- Browser: 33 checks pass and one Playwright WebKit offline-reload scenario is explicitly skipped across 34 Chromium/Mobile Safari checks. Chromium passes full offline reload; every runnable WebKit flow is green.
- Accessibility/visual: axe reports no detectable violations on every primary route, the Finance entry form, action preview, or dark Settings state. Automated 320 px overflow/touch/reduced-motion checks pass, and manual browser inspection covers 320 × 568 and 390 × 844 light/dark states.
- Defect found and fixed during hardening: dark-theme accent controls now use a dark foreground, restoring WCAG AA contrast; compact skip, segmented, and category controls meet the 44 px target.
- Remaining release evidence is intentionally outside M7: live Pages validation and physical-iPhone Safari acceptance in M8–M9.

## 8. Privacy checks

- Verified: logger tests and runtime capture reject prohibited context and expose no action payload or identifier in console messages.
- Verified: request capture proves fragment payloads remain absent from network URLs during a complete action flow.
- Verified: production source maps remain disabled and the artifact contains no backup-like JSON.
- Verified: fixtures and browser records are explicitly synthetic and non-personal.
- Verified: backup patterns are ignored by Git; this check repeats before final release.

## 9. Visual/accessibility checks

- Automated and visually inspected: 320 px compact plus current iPhone-class viewport.
- Automated and visually inspected: light, dark, and reduced-motion preferences.
- Automated: empty, representative, long Chinese content, validation, storage error, and offline states; update activation remains a physical M9 check.
- Automated: 44 px touch targets, 16 px form text, safe-area clearance, and no horizontal overflow or hidden bottom content.
- Automated: headings, landmarks, current navigation state, labels, errors, contrast, and non-color indicators; physical touch/focus feel remains M9 evidence.

## 10. Release commands

Local non-E2E gate:

```bash
pnpm peers check
pnpm quality
```

Production browser gate:

```bash
pnpm build
pnpm test:e2e
```

Deployed HTTPS gate after Pages reports its URL:

```bash
LIFEINDEX_DEPLOYED_URL=https://OWNER.github.io/REPOSITORY/ pnpm test:deployed
```

M8 CI runs equivalent frozen-lockfile commands and retains useful reports on failure without uploading personal data.

## 11. M8 deployed-smoke preparation

- The separate configuration rejects missing targets and insecure non-local HTTP origins before opening a browser.
- The suite verifies the response, five routes and unknown-route fallback, axe result, manifest base fields/icons, exact worker scope, runtime errors, and unexpected failed requests.
- Fresh ephemeral profiles prove synthetic Finance persistence without a backend, action-fragment network privacy, and offline mutation in Chromium/WebKit; Chromium additionally reloads the cached shell offline.
- Local proof on 2026-09-03: both `http://127.0.0.1:4173/` and `http://127.0.0.1:4173/LifeIndex/` record 9 passed and one explicit Playwright WebKit offline-reload skip out of 10 scenarios.
- Live HTTPS evidence remains pending until the approved repository is deployed; physical Safari evidence remains M9-only.

## 10. Evidence recording

For each verified milestone, `PLAN.md` records commands/results and the corresponding commit. `REQUIREMENTS_TRACEABILITY.md` points to named test files rather than relying on an unqualified “tests passed.” M8/M9 operations guides record deployed and physical evidence separately.
