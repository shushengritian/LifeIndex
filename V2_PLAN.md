# LifeIndex V2 Version Plan

**Status:** V2-M6 complete — V2-M7 physical-iPhone acceptance in progress
**Started:** 2026-09-06
**Target release:** `v2.0.0` after approval, implementation, deployment, and physical-iPhone acceptance
**Product baseline:** [LifeIndex-Project-Baseline.md](LifeIndex-Project-Baseline.md)
**Design specification:** [docs/design/V2_UI_INTERACTION.md](docs/design/V2_UI_INTERACTION.md)

## Objective

Refresh LifeIndex into a calmer, faster, more iPhone-native daily companion while preserving the proven V1 local-first architecture and explicitly expanding Habits into a lightweight Health domain. The highest-frequency actions—reviewing today, recording a transaction, checking in a habit, recording weight or activity, and starting focus—should become visually clearer and require less decision-making.

V2 follows a gated sequence:

1. Design the UI and interaction model.
2. Obtain explicit owner approval.
3. Freeze the product and technical change set.
4. Produce implementation-ready PRD, IA, HLD, LLD, DEV, migration, and test documentation.
5. Implement in small vertical slices with automated verification.
6. Deploy to GitHub Pages.
7. Complete owner-led physical-iPhone acceptance.
8. Publish the final `v2.0.0` release only after the evidence is recorded.

No production UI, business behavior, storage schema, or deployed release is changed before the design approval gate.

## Design thesis

V2 keeps LifeIndex visually quiet and deliberately small. It improves the presentation and the shortest path through each existing task without turning the product into a comprehensive life-management system:

- **Today** is a short daily list, led by health habits and immediate actions rather than a dashboard.
- **Finance** is optimized for one-handed, fast entry and a ledger that is easy to scan by day.
- **Health** combines existing habits with lightweight body-weight and activity records; it does not become a diet, medical, or full workout-planning system.
- **Focus** makes the timer the dominant object and keeps session details secondary.
- **Settings** uses familiar grouped iOS patterns for data safety, appearance, categories, and help.

The primary Finance visual references remain **MOZE** and the Chinese app **记账本**. Health takes Gentler Streak's calm wellbeing hierarchy, Happy Scale's legible weight direction, and Hevy's direct workout logging while deliberately omitting their advanced recommendation, prediction, routine, exercise-library, social, wearable, and cloud systems. Earlier references such as Dime, Streaks, and HabitKit remain secondary lessons only: restraint, one-tap completion, and readable history.

## Approved baseline carried forward

- Progressive Web App installed from Safari to the iPhone Home Screen.
- IndexedDB remains the sole primary business database.
- The service worker caches the application shell only.
- No account, backend, analytics, cloud database, or third-party telemetry.
- Existing Finance, Habits, Focus, Today, Settings, backup/restore, offline, and URL Action capabilities remain supported; Habits moves under the Health presentation domain without reinterpreting its records.
- Amounts remain integer minor currency units; date-sensitive records retain local calendar date keys.
- Existing user data must remain readable through the entire V2 upgrade.

## Proposed V2 scope

### Shared application shell

- Replace the persistent brand/tagline/version block with a compact contextual top bar.
- Replace character-based navigation markers with a consistent line-icon set and short labels.
- Establish a small shared spacing, type, radius, motion, and semantic-color system with only two surface levels.
- Provide complete light and dark themes, with “follow system” as the default preference.
- Preserve safe areas, reduced motion, keyboard access, and 44 px minimum targets.
- Make all major states explicit: loading, empty, ready, pending save, recoverable failure, and offline/update available.

### Today

- Use a plain date/title header and a compact completion count; do not add a motivational hero, score, ring, or dashboard panel.
- Keep health habits directly actionable from Today.
- Promote “记一笔” and “开始专注” as the two primary actions.
- Show finance and focus as two compact summary rows with no additional analysis.
- Keep Today as a projection only; it must not create independent business records.

### Finance

- Replace the Today/Week/Month/History tab strip with a monthly calendar board.
- Show each recorded day's compact amount directly in its calendar cell and allow the user to select a day.
- Place the smaller month balance, expense, and income totals immediately below the calendar.
- Show the selected day's ledger below the month totals and preserve month navigation for history.
- Introduce a bottom-sheet quick-entry flow for new transactions.
- Use a large amount display, expense/income toggle, recent-first category grid, date shortcut, and optional note.
- Keep existing category/trend reports below the calendar-ledger flow without adding new budget or account concepts.
- Preserve input on validation or persistence failure.

### Health

- Rename the Habits destination to Health and keep the bottom navigation at five items: Today, Finance, Focus, Health, and Settings.
- Lead with a compact body-weight block showing the latest value, a neutral recent trend, and a quick record action.
- Show recent activity and a weekly count/duration summary; new activity entry stays limited to type, duration, perceived intensity, date/time, and optional note.
- Keep scheduled habits as one-tap rows with current streak context and gentle completion feedback.
- Preserve the habit-detail screen with current/longest streak, fourteen-week completion heatmap, monthly completion rate, total completions, and recent check-ins.
- Keep existing habit records unchanged; weight and activity require additive, versioned storage only after G1 approval.
- Confirm persistence before final completion feedback and roll back the visual state on failure.

### Focus

- Center the start and active states on a large timer ring.
- Keep 25/50/custom presets immediately accessible.
- Move title, category, and note into a compact setup sequence.
- Retain active-session reconciliation and completed-session history.
- Keep interruption, completion, and edit states visually distinct.

### Settings

- Reorganize Settings into four independent groups in this order: Categories, Appearance, Data & security, and Other.
- Present Appearance as its own full-width group between Categories and Data & security; open theme choices from its Theme row.
- Make “仅保存在此设备” and backup status visible without alarmist language.
- Keep destructive actions isolated and require confirmation.

## Explicit non-goals for this design cycle

The following are not authorized by the V2 UI refresh and require separate product decisions:

- budgets, wallets, accounts, debts, investments, recurring bills, or bank/payment imports;
- automatic payment recognition, notification scraping, or background automation;
- cloud sync, login, shared households, backend services, or analytics;
- AI categorization or remote model calls;
- native Swift/SwiftUI packaging;
- destructive schema migration or reinterpretation of existing Habits records;
- calorie/macro tracking, meal plans, medical advice, BMI judgments, workout routines, exercise libraries, sets/reps/load, rest timers, personal records, or social fitness;
- direct Apple Health/HealthKit, wearable, or sensor synchronization within the current PWA;
- new Shortcut behavior beyond presenting the existing URL Action capability more clearly.

## Delivery milestones and gates

### V2-M0 — Current-state intake

**Status:** Complete

- Confirm the V1 repository, documentation baseline, current mobile shell, deployment path, and local-first constraints.
- Identify the high-friction UI patterns without changing product behavior.
- Record the V2 scope boundary and release sequence.

**Evidence:** V1 baseline and plan reviewed; production build passes on 2026-09-06.

### V2-M1 — UI and interaction design

**Status:** Complete — owner approved Revision 5 on 2026-09-06

- Produce a high-fidelity iPhone design covering Today, Finance, Finance quick entry, Focus, Health, habit detail, and Settings.
- Demonstrate the primary interactions: tab navigation, habit check-in, health-record chooser, focus preset selection, and finance entry sheet.
- Define responsive, accessibility, light/dark, state, and motion behavior.
- Present the design and collect owner changes.

**Evidence:** Revision 5 covers all five destinations plus a habit-detail view. Health combines a compact weight trend, recent activity, weekly movement summary, today's habits, and an add-record chooser without adding a bottom destination. Finance calendar and quick entry, habit history, Focus, and the four Settings groups remain represented. Automated interaction checks cover these paths in light and dark themes. The owner replied “开始按计划推进吧” on 2026-09-06, explicitly advancing the approved design into the documented delivery sequence.

**Exit gate G1:** The owner explicitly replies that the design is approved, or approves it after requested revisions.

### V2-M2 — Requirements and architecture freeze

**Status:** Complete — product, data, backup, implementation, risk, traceability, and test contracts agree on 2026-09-06

- Update the PRD and information architecture with final approved behavior.
- Resolve proposed [ADR-0006](docs/adr/0006-v2-health-domain.md) and write any further material decisions.
- Update HLD and LLD for component boundaries, state transitions, routing, persistence calls, and failure recovery.
- Design additive IndexedDB and backup-schema migrations for weight and activity records while preserving every V1 store and record; specify forward migration, validation, rollback, and recovery before code.
- Produce the implementation matrix and traceability map.

**Evidence:** PRD and IA define the approved UI behavior; HLD/LLD define module/state/failure boundaries; DATA_MODEL and BACKUP_SCHEMA freeze integer units, additive schema V2, legacy backup migrations, and atomic restore; ADR-0007 accepts the compatibility decision; DEV, TEST_PLAN, traceability, and risk documents use the same nine-store scope.

**Exit gate G2:** Passed. Product, architecture, data safety, and test documents agree on the same scope.

### V2-M3 — Data foundation, shared design system, and application shell

**Status:** Complete

- Implement and verify the additive schema V2, Health types/repositories, backup V2 migration/restore, and stable Activity seeds before Health UI writes exist.
- Implement tokens, typography, shared primitives, icons, navigation, top bar, sheets, rows, and feedback states.
- Add focused unit/component tests and mobile visual checks.
- Verify 320 px and 390 px widths, safe areas, light/dark appearance, and reduced motion.

**Evidence:** Schema V2 retains both Dexie declarations, adds only `weightEntries` and `activitySessions`, seeds six stable Activity categories, implements Weight/Activity repositories, and emits/accepts backup V2 with V0/V1 in-memory migrations. A populated real schema-V1 fixture preserves all representative old rows. The shared shell now uses five line-icon destinations, a compact local-only header, reusable inert/focus-restoring sheets, complete light/dark tokens, and responsive 320/390 layouts. Unit/integration coverage reaches 22 files / 125 tests after the Health UI failure cases were added; ESLint and strict TypeScript pass.

### V2-M4 — Vertical feature slices

**Status:** Complete

Implement and verify one reviewable slice at a time:

1. Today and shared quick actions.
2. Finance ledger and quick-entry sheet.
3. Health overview, weight/activity entry, and Habits continuity/detail view.
4. Focus setup, active timer, and history.
5. Settings grouping and data-safety presentation.

Each slice includes documentation, comments on key logic, privacy-safe logs, narrow automated checks, and regression checks for existing data operations.

**Evidence:** Today, Finance, Health/Habits, Focus, and Settings are implemented against the frozen repositories and contracts. Finance has a Monday-first selectable month calendar, daily net cells, compact month totals, selected-day ledger, reports, and quick-entry sheet. Health has Weight target/trend/history, Activity weekly summary/history, retained Habit CRUD/check-in/detail, and the three-action add chooser. Settings exposes Categories, Appearance, Data & security, and Other as four independent groups. Health create/edit/delete/target and retained critical workflows run in both browser engines.

### V2-M5 — Integrated hardening

**Status:** Complete — local versioned gate passed on 2026-09-06

- Run format, lint, typecheck, unit, integration, E2E, accessibility, build, and offline/update suites.
- Verify backup/export/import compatibility with V1 records and the new versioned Health record types.
- Verify update recovery, dirty-form protection, direct URL Actions, storage failures, and timer resume after iOS suspension.
- Complete a migration rehearsal: install V1, create representative data, upgrade to the additive V2 schema, and verify all old and new records plus rollback behavior.

**Evidence:** The final `2.0.0` root-path production build passes 35 Playwright scenarios with one documented WebKit-only offline-reload skip. The GitHub Pages-equivalent `/LifeIndex/` build passes 11 deployed-smoke scenarios with the same single skip, including base-scoped routes/assets/manifest/worker, local Health persistence, offline mutation, and fragment privacy. The full Vitest suite passes 22 files / 125 tests, including populated V1-to-V2 migration and atomic backup rollback. Axe reports no detectable violations on all primary routes and Finance/Health sheets. Automated 320 px checks prove no horizontal overflow and at least 44 × 44 calendar capture targets; direct browser inspection covers 390 px Finance/Health light appearance, Settings dark appearance, and the 320 px Finance first screen. Prettier, ESLint, strict TypeScript, production build, and repository diff checks pass.

### V2-M6 — GitHub Pages release candidate

**Status:** Complete — verified Pages candidate deployed on 2026-09-06

- Review the release diff and repository cleanliness.
- Push the approved commit set to GitHub.
- Observe the GitHub Actions Pages workflow.
- Run deployed smoke, installability, deep-link, asset-path, and service-worker update checks.
- Do not tag the final release yet.

**Evidence:** Implementation commit `2162c32` passed [branch CI run 34033594594](https://github.com/shushengritian/LifeIndex/actions/runs/34033594594), and the owner explicitly confirmed the V1 backup file exists before production changed. `main` then fast-forwarded without conflict to candidate commit `55706aa`. [Pages run 34034416695](https://github.com/shushengritian/LifeIndex/actions/runs/34034416695) passed 22 files / 125 Vitest tests, 35 browser scenarios with one documented WebKit skip, configured-base artifact deployment, and 11 live HTTPS scenarios with the same skip. An isolated retained V1 browser profile discovered the waiting worker and updated from 0.1.1 to 2.0.0; Settings then reported logical database version 2 and the four approved groups. This browser evidence is not physical-iPhone evidence.

### V2-M7 — Physical-iPhone acceptance

**Status:** In progress — verified candidate ready for owner execution

The owner verifies on the installed Home Screen app:

- existing V1 data remains present after the update;
- cold start, offline reopen, background/foreground, and display-mode behavior;
- Today navigation and health-habit completion;
- Health weight/activity entry, history, trends, and failed-save recovery;
- finance entry, edit, delete, history, and failed-save recovery;
- focus start, background resume, complete/interrupt, and history;
- light/dark appearance, keyboard behavior, safe areas, and 320/390-class layouts as available;
- backup export, validation-before-import, and recovery instructions;
- update prompt and reload behavior.

Codex records only results the owner explicitly reports; opening the site on a phone is not treated as evidence for unrelated checks.

### V2-M8 — Publish `v2.0.0`

**Status:** Blocked by V2-M7

- Record physical and automated evidence.
- Resolve or explicitly accept every release-blocking defect.
- Update changelog, release notes, screenshots, support and rollback guidance.
- Tag `v2.0.0` and verify the final deployed commit/tag relationship.

## Quality gates

- No loss, overwrite, or reinterpretation of existing IndexedDB records.
- No core data moved to `localStorage`.
- No personal amount, title, note, habit name, weight, activity detail, backup body, or URL Action content appears in logs.
- Every primary action works with touch targets of at least 44 × 44 CSS px.
- The interface remains usable at 320 CSS px without horizontal scrolling.
- Dark appearance and reduced-motion behavior are intentional, not accidental inversions.
- Loading and failures are never represented as zero or success.
- Finance entry remains recoverable after invalid input or a write failure.
- Habit completion is reversible and persistence failures restore the prior visual state.
- Existing Habits records retain their identifiers and semantics under Health; weight and activity records use additive versioned stores and backup fields.
- Active focus sessions reconcile from persisted timestamps rather than depending on a foreground interval.
- Deployed assets and routes work under the `/LifeIndex/` GitHub Pages base path.

## Review checklist for G1

The owner should review the first design against these questions:

- Do both the light and dark themes feel suitable for daily long-term use?
- Does the MOZE/记账本-inspired hierarchy feel familiar without making LifeIndex look like a large finance system?
- Is Today ordered correctly, with health habits first and finance/focus summaries secondary?
- Does the Finance calendar make daily amounts and day selection clear enough at iPhone size?
- Is the finance bottom sheet faster and clearer than the V1 form?
- Does Health feel like one coherent lightweight domain rather than three mini-apps?
- Are weight direction and activity history useful without calorie counting, medical judgment, or a full gym logger?
- Does habit completion and detail remain clear inside Health without creating pressure?
- Is the focus screen quiet enough to support concentration?
- Are any V1 capabilities missing or unnecessarily harder to reach?
- Should any proposed interaction be revised before technical documents and code are generated?

## Plan maintenance

- Update this file whenever evidence changes a milestone, a review decision changes scope, or a risk changes sequencing.
- After G1, convert design assumptions into explicit approved requirements before implementation.
- New product ideas discovered during implementation go to the backlog unless the owner explicitly approves changing the release scope.
- A milestone is complete only when its stated evidence exists; time spent or code written is not completion evidence.

## Decision log

| Date | Decision | Status |
| --- | --- | --- |
| 2026-09-06 | Start V2 with a UI/interaction-first workflow and an owner approval gate before implementation. | Active |
| 2026-09-06 | Keep the first design inside V1 capability and storage boundaries; treat new business features as separate decisions. | Proposed for G1 |
| 2026-09-06 | Use a finance quick-entry sheet, habit one-tap rows, a timer-led Focus screen, and compact iOS-style settings groups. | Proposed for G1 |
| 2026-09-06 | Revision 2 makes MOZE and 记账本 the primary references, removes dashboard-like decoration, and provides explicit light/dark themes. | Proposed for G1 |
| 2026-09-06 | Revision 3 replaces Finance period tabs with a clickable monthly calendar, adds a dedicated habit statistics detail, and moves Appearance into the requested full-width Settings row. | Proposed for G1 |
| 2026-09-06 | Revision 4 separates Settings into four independent groups: Categories, Appearance, Data & security, and Other. | Proposed for G1 |
| 2026-09-06 | Revision 5 makes Health the third business domain, combining unchanged Habits with minimal weight and activity records while retaining five bottom destinations. | Accepted at G1; see ADR-0006 |
| 2026-09-06 | Use additive schema V2 stores, integer grams/minutes, Activity categories, optional target setting, and backup format V2 with V0/V1 in-memory migration. | Accepted at G2; see ADR-0007 |
| 2026-09-06 | Use Monday-first semantic calendar rows and an edge-to-edge narrow-screen calendar so 320 px capture targets retain the 44 px floor. | Implemented and verified locally |

## Change log

| Date | Change |
| --- | --- |
| 2026-09-06 | Completed V2-M6/G6: owner confirmed the V1 backup, `main` fast-forwarded to `55706aa`, Pages run 34034416695 deployed successfully, and all 11 runnable live-smoke scenarios passed. Opened physical-iPhone acceptance. |
| 2026-09-06 | Pushed V2 implementation commit `2162c32`; branch CI run 34033594594 passed all quality and browser gates. Production merge remains behind the owner V1-backup prerequisite. |
| 2026-09-06 | Completed V2-M5/G5: 125 Vitest checks, 35/1 dual-engine E2E, 11/1 `/LifeIndex/` deployment smoke, accessibility, privacy, offline, backup/migration, and responsive gates pass locally. |
| 2026-09-06 | Completed V2-M3/M4 implementation; started integrated hardening with 125 Vitest checks, 35 dual-engine browser passes, accessibility checks, and 320/390 visual inspection. |
| 2026-09-06 | Completed V2-M2/G2 and started V2-M3 with the data foundation before visual implementation. |
| 2026-09-06 | Recorded the owner's approval of Revision 5, completed V2-M1/G1, accepted ADR-0006, and started V2-M2 documentation freeze. |
| 2026-09-06 | Revised M1 to replace the Habits destination with a lightweight Health overview and recorded the additive data impact in ADR-0006. |
| 2026-09-06 | Revised M1 Settings so Categories, Appearance, Data & security, and Other are four separate groups. |
| 2026-09-06 | Revised M1 with a selectable Finance calendar, per-day amounts, habit streak/heatmap/statistics detail, and reordered Appearance settings. |
| 2026-09-06 | Revised M1 after owner feedback: narrowed the reference system, simplified Today and Habits, and made both themes directly reviewable. |
| 2026-09-06 | Completed the M1 self-review for primary interactions, light/dark rendering, and 44 px touch targets; G1 remains awaiting owner review. |
| 2026-09-06 | Created the V2 version plan and opened V2-M1 design review. |
