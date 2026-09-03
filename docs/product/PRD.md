# LifeIndex V1 Product Requirements Document

**Product:** LifeIndex

**Tagline:** Index your life.

**Status:** Implementation baseline

**Version:** 1.0-draft

**Date:** 2026-09-03

**Source:** `LifeIndex-Project-Baseline.md`

## 1. Purpose

LifeIndex V1 is a local-first personal life index optimized for one person's daily use on an iPhone. It combines lightweight finance tracking, focus sessions, and habit check-ins into a calm daily view while preserving complete user ownership through versioned JSON backups.

This document turns the approved product baseline into numbered, testable requirements. It does not approve the later Journal, Writing, Timeline, or Insights modules.

## 2. Product outcome

After adding LifeIndex to the iPhone Home Screen, the user can quickly answer:

- Where did my money go?
- Where did my time and attention go?
- What have I kept doing?
- What is the state of my day?

The core workflows remain available after the first successful load when the device is offline. All primary records remain in that browser's IndexedDB database unless the user explicitly exports a backup.

## 3. Target user and environment

### Primary user

- One private user who expects to use the product for years.
- Uses an iPhone as the primary device and launches from a Home Screen icon.
- Prefers fast capture and clear review over complex configuration.
- Accepts manual Files/iCloud Drive backup in V1 in exchange for no account or backend.

### Primary environment

- Mobile Safari and installed Home Screen web-app mode on the user's current iPhone.
- Chinese interface, `LifeIndex` English brand, device-local calendar/time zone.
- Default currency `CNY`, stored as an ISO 4217 setting so a later supported change does not require rewriting amounts.
- HTTPS static hosting on GitHub Pages; localhost is used for development.

The final minimum iOS/Safari version will be recorded after checking the user's device during physical acceptance. Development targets current standards-capable iOS Safari without relying on experimental browser flags.

## 4. Scope

### Included in V1

- Five primary destinations: Today, Finance, Focus, Habits, Settings.
- IndexedDB schema, repositories, migrations, and privacy-safe local logging.
- Versioned JSON export, import preview, replace restore, and rollback on failure.
- Offline application shell and installed-PWA update handling.
- Safe URL Actions for selected high-frequency operations.
- Automated quality gates, GitHub CI, GitHub Pages, and physical-iPhone acceptance.

### Explicitly excluded

- Native Swift/SwiftUI application, App Store, or Apple Developer Program.
- Account, authentication, backend, cloud database, real-time cross-device sync, or multi-user use.
- Complex budgeting, multiple accounts, investments, balance sheets, or accounting reports.
- Project management features in Focus.
- Journal, Writing, Timeline, Insights, AI, attachments, photos, or location.
- Automatic iCloud database synchronization. iCloud Drive is only a user-selected backup destination.

## 5. Product principles

When requirements compete, resolve them in this order:

1. Data safety
2. Fast daily interaction
3. Offline reliability
4. Maintainability
5. Long-term extensibility
6. Visual quality
7. Feature quantity

## 6. Functional requirements

### 6.1 Application shell and navigation

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| APP-001 | The application shall show Today, Finance, Focus, Habits, and Settings as the five primary destinations. | All five destinations are reachable in at most one tap from the primary bottom navigation; the active destination is visually and semantically identified. |
| APP-002 | Today shall be the default destination. | A normal launch and a Home Screen launch without a deep action open Today. |
| APP-003 | The shell shall present loading, initialization failure, and recovery states. | A database-open failure never produces a blank screen; the user sees a safe retry/export-support path and a privacy-safe error identifier. |
| APP-004 | Navigation shall work under a GitHub Pages project subpath and after an offline reload. | Direct app launch, internal navigation, manifest start URL, and cached reload succeed from the deployed project URL. |

### 6.2 Finance

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FIN-001 | The user shall create an expense or income transaction. | Type, positive amount, category, local date/time, and optional note are accepted; invalid or zero amounts are rejected before storage. |
| FIN-002 | Currency values shall be precise and consistently displayed. | Values are stored in integer minor units and rendered using the configured ISO currency; calculations contain no binary floating-point rounding artifacts. |
| FIN-003 | The user shall edit or delete a transaction. | Edit preserves the record identity and timestamps; delete requires confirmation and removes only the selected record. |
| FIN-004 | The user shall browse transactions for today, this week, this month, and history. | Each period uses the device-local calendar boundary and displays newest records first with an understandable empty state. |
| FIN-005 | Finance shall summarize income, expense, and balance. | Selected-period totals equal the underlying transactions and update after create/edit/delete without a reload. |
| FIN-006 | Finance shall show a monthly category breakdown and a restrained recent trend. | Category values sum to monthly expense; the trend uses existing data and remains legible without a heavy dashboard. |
| CAT-001 | The user shall manage finance categories. | Default income/expense categories exist; categories can be created, renamed, reordered, or archived. Referenced categories are not destructively removed. |

### 6.3 Habits

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| HAB-001 | The user shall create and edit a habit. | Name, visual marker, schedule, start date, and active state are stored; duplicate names are allowed but empty names are rejected. |
| HAB-002 | V1 schedules shall support every day or selected weekdays. | Today shows a habit only when the local date is on/after its start date, it is active, and the weekday is scheduled. |
| HAB-003 | The user shall check in or undo a daily habit completion. | At most one record exists per habit and local date; repeat taps are idempotent and the displayed state updates immediately. |
| HAB-004 | The user shall pause a habit without losing history. | Pausing removes future scheduled prompts while past records and statistics remain available. |
| HAB-005 | Habits shall provide calendar and progress views. | The user can inspect daily completion in a monthly calendar and see current streak, longest streak, current-month rate, and total completions. |
| HAB-006 | Streaks shall respect the habit schedule. | Unscheduled dates do not break a streak; calculations use local date keys and have boundary tests. |

### 6.4 Focus

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FOC-001 | The user shall start a 25-minute, 50-minute, or custom-duration focus session. | A title is required; duration is bounded by documented safe limits; start time and intended duration persist immediately. |
| FOC-002 | The active timer shall survive background suspension and reload. | Remaining/elapsed time is derived from persisted timestamps rather than callback counts and is correct after returning from the background or reopening the app. |
| FOC-003 | The user shall complete, finish early, or cancel the active session. | Completion/early finish creates one valid history record; cancel requests confirmation and creates none; repeated transitions cannot duplicate a session. |
| FOC-004 | Only one focus session may be active. | Starting while active returns the existing session rather than creating a second timer. |
| FOC-005 | The user shall browse and maintain focus history. | History is newest-first; the user can edit descriptive fields or delete a record with confirmation without changing measured duration accidentally. |
| FOC-006 | Focus shall summarize time and count. | Today/week totals and monthly/category distributions equal stored completed sessions. |

V1 does not include pause/resume intervals, task management, team projects, or Pomodoro automation.

### 6.5 Today

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| TOD-001 | Today shall show the current local date and a concise daily summary. | Income/expense, focus duration/count, and scheduled-habit completion match their source modules for the current local date. |
| TOD-002 | Today shall offer high-frequency actions. | Add transaction, start focus, and habit check-in are reachable without opening Settings and in no more than two purposeful taps. |
| TOD-003 | Today shall remain calm and actionable. | It uses progressive disclosure and clear empty states; it does not show unrelated historical dashboards or motivational pressure. |

### 6.6 Settings

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| SET-001 | Settings shall expose backup, restore, category management, habit management, appearance, and version information. | Every listed capability has a clear entry and status; no daily capture action exists only in Settings. |
| SET-002 | The user shall select system, light, or dark appearance. | Selection applies immediately, persists in IndexedDB settings, and system mode follows the OS preference. |
| SET-003 | Settings shall show data safety information. | The user sees last successful export time when known, schema/app version, local-storage limitations, and a recommendation to keep external backups. |

### 6.7 Backup and restore

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| BKP-001 | The user shall export all V1 business data and settings as versioned JSON. | The file follows `lifeindex-backup-YYYY-MM-DD-HHmm.json`, validates against the documented schema, and includes no cache or log data. |
| BKP-002 | Export shall work through the iOS browser file/share flow without requiring Shortcuts. | The physical-iPhone checklist confirms a test backup can be saved to Files/iCloud Drive. |
| BKP-003 | Import shall parse and validate before any current-data mutation. | Invalid JSON, unsupported versions, duplicate keys, invalid references, or invalid values produce a preview error and leave current data byte-for-byte logically unchanged. |
| BKP-004 | V1 restore shall use explicit replace semantics. | A valid import shows version, backup time, and per-entity counts; replacement occurs only after a separate confirmation. Merge restore is documented as out of scope. |
| BKP-005 | Restore shall be atomic from the user's perspective. | All records are replaced successfully or the previous database remains available; failure includes a retry-safe message and privacy-safe log. |
| BKP-006 | Backup compatibility shall be testable. | Current round-trip and supported older fixture migrations pass automated tests before release. |

### 6.8 PWA and offline behavior

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| PWA-001 | LifeIndex shall provide an installable manifest and iPhone metadata. | Product name, short name, icons, theme/background color, display mode, start URL, scope, viewport, safe areas, and Apple touch icon are valid under the deployed subpath. |
| PWA-002 | Core workflows shall work offline after one successful online load. | In airplane mode the installed app launches, reads existing data, and creates/edits records; changes remain after reopening. |
| PWA-003 | The service worker shall cache the app shell, not business data. | Cache inspection contains versioned static assets only; IndexedDB remains the sole business-data source. |
| PWA-004 | Application updates shall be explicit and recoverable. | When a new worker is ready, the user can apply the update; the app does not silently discard in-progress input or active focus state. |
| PWA-005 | Offline and update failures shall be understandable. | Status messaging distinguishes offline use, first-load network failure, and update failure without blocking valid local operations. |

### 6.9 URL Actions and iOS Shortcuts

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| ACT-001 | V1 shall support fragment-based action routes for add transaction, habit check-in, and start focus. | Action payload stays after `#`, is parsed client-side, and no sensitive payload appears in an HTTP request. |
| ACT-002 | Actions shall validate and preview before mutation. | Invalid values show field errors; valid actions open a confirmation/prefilled UI and do not write until the user confirms. |
| ACT-003 | Actions shall prevent accidental duplicate submission. | A documented action ID/idempotency mechanism prevents repeated launch/refresh from creating duplicate records. |
| ACT-004 | Action state shall be removed after completion or cancellation. | Refreshing the resulting screen does not replay the action; browser history does not retain the active sensitive fragment longer than needed. |

## 7. Non-functional requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| NFR-DAT-001 | Business data shall remain local unless the user exports it. | No application request sends records to an API, analytics, error tracker, or log collector. |
| NFR-DAT-002 | Schema evolution shall preserve supported data. | Each schema version has a documented migration; destructive changes have fixtures and rollback/failure tests. |
| NFR-PRV-001 | Logs shall be useful without exposing personal values. | Logs may contain event names, versions, counts, safe IDs, and error classes; tests/review find no amounts, notes, titles, or backup payloads. |
| NFR-OFF-001 | Offline behavior shall be a release gate. | The production artifact passes a cold-online-then-offline launch and mutation scenario. |
| NFR-UX-001 | Daily actions shall be touch-first and fast. | Primary targets are at least 44 by 44 CSS pixels, forms avoid horizontal scrolling at 320 CSS pixels, and high-frequency actions meet their tap limits. |
| NFR-A11Y-001 | Core flows shall be accessible. | Semantic labels, focus order, contrast, non-color state indicators, reduced motion, and screen-reader names pass automated checks plus manual review. |
| NFR-REL-001 | Errors shall fail safely. | Database, import, worker, and action failures never produce silent data replacement or an unrecoverable blank screen. |
| NFR-MNT-001 | The codebase shall remain modular and documented. | Feature code depends on explicit shared/data interfaces; key branches/transitions have rationale comments and privacy-safe logs; changed docs ship with code. |
| NFR-TST-001 | Every release shall pass the documented quality gate. | Format, lint, typecheck, unit/integration, production build, mobile WebKit E2E, and deployed smoke evidence are recorded. |

## 8. Key user journeys

### First launch

1. User opens the HTTPS URL.
2. App initializes IndexedDB and default categories/settings.
3. App explains that records stay on this device and recommends adding to Home Screen and creating backups.
4. User can immediately create a transaction, habit, or focus session without registration.

### Daily capture

1. User opens Today from the Home Screen.
2. User sees the day's concise status.
3. User uses a quick action or the target module.
4. Mutation is validated and committed locally.
5. UI acknowledges success without blocking the next action.

### Backup and recovery

1. User exports a versioned test backup to Files/iCloud Drive.
2. On restore, the app validates and shows a count preview.
3. User explicitly confirms replacement.
4. App replaces all V1 stores atomically and reports the result.
5. User verifies summary and representative records.

## 9. Success signals without telemetry

LifeIndex sends no usage analytics. Product success is established through local acceptance evidence:

- Core capture actions complete without error and within the stated tap limits.
- The user chooses to launch from the Home Screen in normal use.
- Automated backup round trips remain green across releases.
- Physical-iPhone offline and persistence checks pass.
- No known release-blocking data-loss defect remains.

## 10. Release acceptance

V1 is releasable only when:

- Every included requirement is mapped to design, implementation, and test evidence or has an explicit accepted exception.
- No open severity-1 data loss/privacy issue or severity-2 core-workflow issue remains.
- Full local and GitHub CI gates pass from a clean checkout.
- GitHub Pages passes online, reload, mobile, manifest, service-worker, and offline smoke checks.
- The user completes the physical-iPhone installation, persistence, airplane-mode, export, and restore checklist.

## 11. Open decisions

These items do not block M1/M2 local work but must be resolved by the named milestone:

- M2: final dependency choices and supported custom focus duration bounds.
- M2: safe entity-ID exposure policy for logs and URL Actions.
- M8: GitHub owner, repository name, visibility, licensing intent, and acceptance that the static app shell is addressable from its Pages URL.
- M9: user's actual iPhone/iOS version and final compatibility result.
