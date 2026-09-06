# LifeIndex V2 Product Requirements Document

**Status:** Approved product scope; frozen at gate G2

**Version:** 2.0

**Date:** 2026-09-06

**Predecessor:** `v1.0.0`; its shipped behavior remains the compatibility baseline

## 1. Purpose

LifeIndex is a lightweight, local-first iPhone web app for daily finance, focus, and health records. V2 refreshes the mobile UI, replaces the Habits destination with Health, and adds minimal body-weight and activity records without introducing an account, backend, cloud database, or automatic health/payment ingestion.

The approved interaction contract is [V2_UI_INTERACTION.md](../design/V2_UI_INTERACTION.md). This PRD is the implementation authority for V2 behavior; V1 release evidence remains historical and is not reclassified.

## 2. Product outcome

The owner can open the installed Home Screen app and, with little navigation:

- understand today's habit, finance, and focus state;
- record or review a transaction from a calendar-led Finance screen;
- record weight, record activity, and complete habits from one Health destination;
- start or resume a reliable focus timer;
- understand local-data, backup, appearance, and category controls;
- update from V1 to V2 without losing or reinterpreting existing records.

No telemetry is used. Success is established through deterministic tests, deployed smoke checks, and owner-reported physical-iPhone acceptance.

## 3. Target user and environment

### Primary user

- One private owner using personal data.
- Prefers quick manual capture and a calm visual hierarchy over a comprehensive finance, fitness, or productivity system.
- Accepts that records are browser-local and protects them with explicit JSON backups.

### Primary environment

- Safari and an installed Home Screen PWA on the owner's iPhone.
- GitHub Pages at the `/LifeIndex/` project path.
- Intermittent or absent connectivity after the shell has been cached.
- Desktop Chromium/WebKit are development and automated-verification environments, not substitutes for physical-iPhone evidence.

## 4. Scope

### Included in V2

- Five destinations: Today, Finance, Focus, Health, Settings.
- All V1 finance, focus, habit, backup/restore, offline, appearance, category, and URL Action behavior.
- Calendar-led Finance navigation and bottom-sheet-style quick entry.
- Health overview containing existing habits plus manual weight and activity records.
- Optional weight target, neutral recent weight direction, and weekly activity summary.
- Additive IndexedDB V1-to-V2 migration and backup V0/V1-to-V2 migration.
- Complete light, dark, system, compact-width, safe-area, reduced-motion, and accessible states.

### Explicitly excluded

- Budgets, accounts, wallets, investments, debts, recurring bills, bank/payment imports, and automatic payment recognition.
- Login, backend, cloud database/sync, shared households, analytics, advertising, or remote AI calls.
- Native Swift/SwiftUI packaging or direct Apple Health/HealthKit integration.
- Calories, macros, meal plans, BMI or medical judgments, workout programs, exercises, sets, repetitions, load, rest timers, personal records, wearables, and social fitness.
- Merge restore, automatic backup upload, and silent/destructive data repair.
- New iOS Shortcut actions for Health in V2; the three existing fragment URL Actions remain supported.

## 5. Product principles

- **Local-first and explicit:** IndexedDB is business truth; network availability must not gate capture.
- **One dominant task:** each destination has one clear primary action and restrained secondary detail.
- **Progress without judgment:** trends describe direction and completion without scoring bodies or days.
- **Fast but confirmed:** optimistic decoration may begin immediately, but final success appears only after persistence resolves.
- **Recoverable:** failed saves preserve input; invalid imports cannot mutate current data.
- **Compatible:** V1 identifiers, records, local dates, amounts, habit semantics, and focus state remain readable.

## 6. Functional requirements

### 6.1 Application shell and navigation

- **APP-001:** The bottom navigation exposes exactly Today, Finance, Focus, Health, and Settings in that order.
- **APP-002:** The app uses fragment routes compatible with GitHub Pages and redirects legacy `#/habits` bookmarks to `#/health`.
- **APP-003:** A compact contextual header replaces the persistent V1 brand/tagline block; version remains discoverable in Settings.
- **APP-004:** Loading, ready, offline, update-ready, recoverable failure, and fatal initialization states are distinguishable and accessible.
- **APP-005:** Each primary destination is lazy loaded and remains reachable after a direct reload under `/LifeIndex/`.

### 6.2 Finance

- **FIN-001:** The primary Finance view shows a navigable month calendar; cells display a compact daily net amount only when that day has records.
- **FIN-002:** Selecting a calendar day updates the ledger below it without mutating data; month navigation selects a valid day in the target month.
- **FIN-003:** Month balance, expense, and income appear immediately below the calendar in smaller type, using exact integer-minor-unit totals.
- **FIN-004:** The selected-day ledger groups entries in newest-time order and supports create, edit, and confirmed delete.
- **FIN-005:** New-entry opens a mobile sheet with expense/income, amount, category, local date/time, and optional note; the native date/time control uses the same full form-column width as adjacent controls on iOS, and invalid or failed submissions retain the draft.
- **FIN-006:** Reports retain category breakdown and six-month trend without adding budgets or accounts.
- **FIN-007:** Calendar totals, selected-day totals, reports, and restored data include archived referenced categories correctly.
- **CAT-001:** Settings supports create, rename, reorder, archive, and restore for Finance, Focus, and Activity category groups while preserving historical references.

### 6.3 Health overview

- **HLT-001:** Health shows, in one scroll, current weight direction, weekly activity summary/recent activity, and today's scheduled habits.
- **HLT-002:** A single header add control offers exactly Record weight, Record activity, and Create habit; the header, Weight, and Activity add controls use recognizable, optically centered icons with explicit accessible names.
- **HLT-003:** Empty, partial-data, loading, save-pending, and recoverable-error states do not imply zero or success.
- **HLT-004:** Health presents neutral language and never produces medical, BMI, calorie, or fitness-program judgments.

### 6.4 Body weight

- **WGT-001:** The owner can create, edit, and confirmed-delete a manual weight entry with measured local date/time, weight, and optional note.
- **WGT-002:** Weight is persisted as integer grams from 20,000 through 500,000 inclusive and displayed in kilograms with one decimal place.
- **WGT-003:** The overview shows the latest entry and the signed difference from the earliest available entry in the trailing 30 local days; fewer than two entries shows “暂无趋势”.
- **WGT-004:** An optional target is stored as integer grams; absence is valid and target copy is descriptive, not judgmental.
- **WGT-005:** Entries are ordered newest first and remain available by local-date range.

### 6.5 Activity

- **ACTV-001:** The owner can create, edit, and confirmed-delete an activity with type/category, whole-minute duration, perceived intensity, local date/time, and optional note.
- **ACTV-002:** Duration is an integer from 1 through 1,440 minutes; intensity is exactly light, moderate, or hard.
- **ACTV-003:** Activity type references an Activity category; archived types remain readable historically and unavailable for new capture.
- **ACTV-004:** The overview reports the current Monday–Sunday count and total duration and lists recent activities newest first.

### 6.6 Habits inside Health

- **HAB-001:** Existing `habits` and `habitRecords` retain their V1 identifiers, fields, schedules, and completion semantics.
- **HAB-002:** Today's scheduled active habits are one-tap check-in rows with persisted completion feedback and reversible undo.
- **HAB-003:** Habit create, edit, pause/resume, daily/weekday schedule, and optional note remain available from Health.
- **HAB-004:** Habit detail shows current streak, longest streak, total completions, current-month completion rate, a fourteen-week heatmap, and recent check-ins.
- **HAB-005:** Unscheduled dates cannot be accidentally checked in; persistence failure restores the prior visual state.
- **HAB-006:** Pausing affects future presentation and never deletes or reinterprets history.

### 6.7 Focus

- **FOC-001:** Idle Focus leads with a large timer, 25/50/custom presets, and compact title/category/note setup.
- **FOC-002:** At most one active session exists; start is transactionally idempotent.
- **FOC-003:** Remaining time is derived from persisted timestamps and reconciles after reload, suspension, or delayed callbacks.
- **FOC-004:** Natural completion, early finish, and confirmed cancel remain distinct state transitions.
- **FOC-005:** Completed history supports detail edit and confirmed delete without changing measured duration.
- **FOC-006:** Today/week/month/category summaries use completed sessions only.

### 6.8 Today

- **TOD-001:** Today is a read projection and persists no independent business record.
- **TOD-002:** It shows today's scheduled Health habits first, with direct check-in, followed by Finance and Focus summary rows.
- **TOD-003:** “记一笔” and “开始专注” are the two primary quick actions and route to their normal save flows.
- **TOD-004:** A failed source projection is shown as failed, not converted to a zero value.

### 6.9 Settings

- **SET-001:** Settings shows four independent full-width groups in this order: Categories, Appearance, Data & security, Other.
- **SET-002:** Categories exposes Finance expense/income, Focus, and Activity management without combining it with Appearance; its detailed editor is collapsed by default and opens only from the explicit Category management disclosure.
- **SET-003:** Appearance offers System, Light, and Dark, applies immediately, and persists in IndexedDB.
- **SET-004:** Data & security states that records exist only on this device and owns export, import preview, replace confirmation, and last-export status.
- **SET-005:** Other contains version, usage/help, and existing support information; destructive actions remain isolated and confirmed.

### 6.10 Backup and restore

- **BKP-001:** Export emits current backup format V2 containing all nine stores, including weight and activity records.
- **BKP-002:** Import supports V0, V1, and V2; older versions are migrated entirely in memory before current-schema validation.
- **BKP-003:** Preview reveals only version, export time, and counts and cannot mutate IndexedDB.
- **BKP-004:** Restore replaces all stores in one transaction after explicit confirmation; any failure aborts the complete replacement.
- **BKP-005:** Unknown future versions, malformed records, count mismatches, duplicates, invalid state, and dangling references are rejected before writes.
- **BKP-006:** Backup processing and logs never expose record values or backup bodies.

### 6.11 PWA and offline behavior

- **PWA-001:** The installed shell supports online launch, cached offline launch, and offline writes after initial cache readiness.
- **PWA-002:** The service worker caches only versioned application-shell assets; IndexedDB records and action fragments never enter Cache Storage.
- **PWA-003:** An available update requires explicit activation and respects dirty forms.
- **PWA-004:** A source rollback never attempts to downgrade or clear a V2 database.
- **PWA-005:** The manifest, worker scope, routes, and assets work at the GitHub Pages `/LifeIndex/` base path.

### 6.12 URL Actions and iOS Shortcuts

- **URL-001:** Existing add-transaction, check-habit, and start-focus actions remain fragment-only, allowlisted, previewed, and explicitly confirmed.
- **URL-002:** Business mutation and durable receipt are atomic; repeated action UUIDs return the existing result.
- **URL-003:** Cancel, invalid, completed, and duplicate paths remove sensitive fragment fields from the active route.
- **URL-004:** V2 adds no automatic payment recognition and no Health action route.

## 7. Non-functional requirements

- **NFR-DAT:** No V1 record is deleted, rewritten, or assigned invented personal values during database or backup migration.
- **NFR-PRV:** No remote telemetry; logs exclude IDs, amounts, names, titles, notes, weights, activity details, URLs/fragments, and backup content.
- **NFR-OFF:** Core reads/writes operate without network after shell installation.
- **NFR-UX:** Main capture targets are at least 44 × 44 CSS px; forms use at least 16 px text; native date/time controls align in width with adjacent inputs on iOS; circular add icons are optically centered; 320 px width has no horizontal overflow.
- **NFR-A11Y:** Semantic landmarks, labels, focus states, non-color state indicators, contrast, and reduced-motion behavior meet the existing V1 accessibility floor.
- **NFR-REL:** Writes acknowledge only after IndexedDB commit; initialization/migration failure blocks normal writes and never auto-clears storage.
- **NFR-MNT:** Business invariants remain typed, validated, documented, logged safely, and covered by narrow tests.
- **NFR-TST:** Release requires static, unit, integration, dual-engine E2E, deployed smoke, migration rehearsal, and owner-reported physical-iPhone evidence.

## 8. Key user journeys

### V1 owner upgrades to V2

1. The waiting worker appears and the owner accepts the update when no dirty form exists.
2. V2 opens database version 2; Dexie adds the two Health stores without changing seven V1 stores.
3. Missing stable Activity categories are seeded idempotently.
4. Existing transactions, habits, habit records, focus sessions, settings, categories, and action receipts remain present.
5. Health opens with empty weight/activity states and the existing habit records.

### Record and review finance

1. Open Finance; current month and today/selected day are visible.
2. Tap add, enter a transaction in the sheet, and save.
3. After commit, the sheet closes and the selected calendar day, month totals, and ledger refresh.
4. Selecting another day changes only the ledger projection.

### Record health context

1. Open Health and tap add.
2. Choose weight or activity, enter bounded fields, and save.
3. After commit, latest/trend or weekly activity/recent list refreshes.
4. Habit check-in remains directly available in the same destination.

### Backup and recovery

1. Export a V2 JSON backup to Files/iCloud through the browser handoff.
2. Select a V0, V1, or V2 backup; inspect non-mutating metadata.
3. Confirm replacement.
4. Validation/migration completes before the all-store transaction; failure retains current data.

## 9. Release acceptance

V2 may be tagged only when:

- the frozen requirements, implementation, and tests agree;
- a synthetic V1 database upgrades in place with every original record unchanged;
- V0/V1/V2 backup tests, invalid-input tests, and forced restore rollback pass;
- every V2 feature and retained V1 critical workflow passes Chromium and Mobile Safari/WebKit production E2E;
- the exact release candidate passes GitHub Actions and deployed `/LifeIndex/` smoke checks;
- the owner explicitly reports the required installed-iPhone upgrade, offline, persistence, appearance, and backup results;
- no known release-blocking personal-data-loss, privacy, or core offline defect remains.

## 10. Change control

New capabilities discovered during implementation are backlog items unless the owner explicitly changes V2 scope. A persisted-field change requires an ADR, data/backup migration update, and tests before code. Physical-iPhone checks are never inferred from automation or a phone-browser screenshot.
