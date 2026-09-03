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
- Verified: invalid JSON, oversized input, count mismatch, invalid fields, and dangling references start no write; broader corrupted-data permutations remain in M7.
- Verified: a forced insertion failure during replace aborts all store changes.
- Verified: supported V0 backup fixture migrates deterministically and preview tokens are cancelable/one-time.

## 5. M5 feature matrix

### Finance

- Expense/income create, edit, confirm-delete.
- Category type/reference, archived category history, selected-period boundaries.
- Income/expense/balance/category/trend totals.
- Empty, invalid, storage failure, and representative larger list.

### Habits

- Daily and selected-weekday schedules from start date.
- Idempotent check-in and undo compound key.
- Pause preserving history.
- Current/longest streak, month rate, total count; unscheduled/future dates.
- Calendar and accessibility states.

### Focus

- 25/50/custom bounds and required title.
- Single-active invariant.
- Timestamp-derived tick, background/reload resume, overdue natural completion.
- Early finish and confirm-cancel; repeated transition cannot duplicate.
- Today/week/month/category summaries.

### Today and Settings

- Today projections update after feature mutations and never turn read errors into zero.
- Quick-action interaction budgets.
- Appearance persistence and system mode.
- Backup/version/durability status and management routes.

## 6. M6 PWA and URL Action matrix

- Manifest required fields, icons, start URL, scope, colors, and standalone metadata under `/` and a synthetic Pages subpath.
- Initial online load then offline launch/reload/mutation.
- Cache contains app assets but no business records/API responses.
- Waiting worker prompts; dirty form defers reload; approved update activates.
- Fragment action never appears before `#` in a requested URL.
- Each action validates unknown/malformed fields, previews, confirms, writes entity+receipt atomically, clears route, and deduplicates refresh/retry.

## 7. Privacy checks

- Capture console calls for failure and success paths and scan keys/serialized values for prohibited fields.
- Capture browser network requests during representative CRUD, backup inspection, and actions; no record data leaves the origin.
- Inspect built source/maps policy; production source maps remain disabled unless a future security decision changes it.
- Confirm test fixtures contain only synthetic, clearly non-personal values.
- Confirm ignored backup patterns with `git check-ignore` before release.

## 8. Visual/accessibility checks

- 320 px compact and current iPhone-class viewport.
- Light, dark, and reduced-motion preferences.
- Empty, representative, long Chinese content, loading, validation, storage error, offline, and update states.
- 44 px touch targets, 16 px form text, safe-area clearance, no hidden bottom content.
- Headings, landmarks, current navigation state, labels, errors, focus order/visibility, contrast, and non-color indicators.

## 9. Release commands

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

M8 CI runs equivalent frozen-lockfile commands and retains useful reports on failure without uploading personal data.

## 10. Evidence recording

For each verified milestone, `PLAN.md` records commands/results and the corresponding commit. `REQUIREMENTS_TRACEABILITY.md` points to named test files rather than relying on an unqualified “tests passed.” M8/M9 operations guides record deployed and physical evidence separately.
