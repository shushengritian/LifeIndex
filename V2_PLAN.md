# LifeIndex V2 Version Plan

**Status:** Revision 2 draft for owner UI/interaction review — implementation is not authorized yet
**Started:** 2026-09-06
**Target release:** `v2.0.0` after approval, implementation, deployment, and physical-iPhone acceptance
**Product baseline:** [LifeIndex-Project-Baseline.md](LifeIndex-Project-Baseline.md)
**Design specification:** [docs/design/V2_UI_INTERACTION.md](docs/design/V2_UI_INTERACTION.md)

## Objective

Refresh LifeIndex into a calmer, faster, more iPhone-native daily companion while preserving the proven V1 local-first architecture and business scope. The highest-frequency actions—reviewing today, recording a transaction, checking in a habit, and starting focus—should become visually clearer and require less decision-making.

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

- **Today** is a short daily list, led by habits and immediate actions rather than a dashboard.
- **Finance** is optimized for one-handed, fast entry and a ledger that is easy to scan by day.
- **Habits** prioritizes one-tap completion; continuity and statistics stay in the detail view.
- **Focus** makes the timer the dominant object and keeps session details secondary.
- **Settings** uses familiar grouped iOS patterns for data safety, appearance, categories, and help.

The primary visual references are now **MOZE** and the Chinese app **记账本**. LifeIndex takes MOZE's clear hierarchy, theme discipline, and context-first quick entry, while taking 记账本's direct calculator-style amount entry and date-grouped ledger. It does not copy MOZE's extensive accounts, budgets, investments, invoice, or reporting system, and it does not copy unrelated advertising or cloud features from 记账本. Earlier references such as Dime, Streaks, and HabitKit remain secondary lessons only: restraint, one-tap completion, and readable history.

## Approved baseline carried forward

- Progressive Web App installed from Safari to the iPhone Home Screen.
- IndexedDB remains the sole primary business database.
- The service worker caches the application shell only.
- No account, backend, analytics, cloud database, or third-party telemetry.
- Existing Finance, Habits, Focus, Today, Settings, backup/restore, offline, and URL Action capabilities remain supported.
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
- Keep habits directly actionable from Today.
- Promote “记一笔” and “开始专注” as the two primary actions.
- Show finance and focus as two compact summary rows with no additional analysis.
- Keep Today as a projection only; it must not create independent business records.

### Finance

- Introduce a bottom-sheet quick-entry flow for new transactions.
- Use a large amount display, expense/income toggle, recent-first category grid, date shortcut, and optional note.
- Group ledger entries by local date with daily totals.
- Keep period summary and category/trend views available without adding new budget or account concepts.
- Preserve input on validation or persistence failure.

### Habits

- Present scheduled habits as one-tap rows/cards with clear but gentle completion feedback.
- Keep streak, seven-day rhythm, month calendar, and statistics in habit detail rather than repeating them on every daily row.
- Separate active and paused habits without hiding status.
- Confirm persistence before final completion feedback and roll back the visual state on failure.

### Focus

- Center the start and active states on a large timer ring.
- Keep 25/50/custom presets immediately accessible.
- Move title, category, and note into a compact setup sequence.
- Retain active-session reconciliation and completed-session history.
- Keep interruption, completion, and edit states visually distinct.

### Settings

- Reorganize settings into grouped rows: appearance, categories, data and backup, URL Actions/Shortcuts, update state, and about.
- Make “仅保存在此设备” and backup status visible without alarmist language.
- Keep destructive actions isolated and require confirmation.

## Explicit non-goals for this design cycle

The following are not authorized by the V2 UI refresh and require separate product decisions:

- budgets, wallets, accounts, debts, investments, recurring bills, or bank/payment imports;
- automatic payment recognition, notification scraping, or background automation;
- cloud sync, login, shared households, backend services, or analytics;
- AI categorization or remote model calls;
- native Swift/SwiftUI packaging;
- a new IndexedDB schema or destructive migration;
- new Shortcut behavior beyond presenting the existing URL Action capability more clearly.

## Delivery milestones and gates

### V2-M0 — Current-state intake

**Status:** Complete

- Confirm the V1 repository, documentation baseline, current mobile shell, deployment path, and local-first constraints.
- Identify the high-friction UI patterns without changing product behavior.
- Record the V2 scope boundary and release sequence.

**Evidence:** V1 baseline and plan reviewed; production build passes on 2026-09-06.

### V2-M1 — UI and interaction design

**Status:** Awaiting owner review

- Produce a high-fidelity iPhone design covering Today, Finance, Finance quick entry, Focus, Habits, and Settings.
- Demonstrate the primary interactions: tab navigation, habit check-in, focus preset selection, and finance entry sheet.
- Define responsive, accessibility, light/dark, state, and motion behavior.
- Present the design and collect owner changes.

**Evidence:** Revision 2 covers all five destinations and the primary Finance, Habits, and Focus interactions while reducing the number of cards, summary blocks, progress visuals, and secondary states visible at once. Light/dark themes are directly switchable, and demonstrated controls retain the 44 px minimum.

**Exit gate G1:** The owner explicitly replies that the design is approved, or approves it after requested revisions.

### V2-M2 — Requirements and architecture freeze

**Status:** Blocked by G1

- Update the PRD and information architecture with final approved behavior.
- Write ADRs for material decisions.
- Update HLD and LLD for component boundaries, state transitions, routing, persistence calls, and failure recovery.
- Confirm that the IndexedDB schema is unchanged; if approval later introduces a schema change, write and test a forward migration plus rollback/recovery plan first.
- Produce the implementation matrix and traceability map.

**Exit gate G2:** Product, architecture, data safety, and test documents agree on the same scope.

### V2-M3 — Shared design system and application shell

**Status:** Blocked by G2

- Implement tokens, typography, shared primitives, icons, navigation, top bar, sheets, rows, and feedback states.
- Add focused unit/component tests and mobile visual checks.
- Verify 320 px and 390 px widths, safe areas, light/dark appearance, and reduced motion.

### V2-M4 — Vertical feature slices

**Status:** Blocked by V2-M3

Implement and verify one reviewable slice at a time:

1. Today and shared quick actions.
2. Finance ledger and quick-entry sheet.
3. Habits daily list and detail continuity view.
4. Focus setup, active timer, and history.
5. Settings grouping and data-safety presentation.

Each slice includes documentation, comments on key logic, privacy-safe logs, narrow automated checks, and regression checks for existing data operations.

### V2-M5 — Integrated hardening

**Status:** Blocked by V2-M4

- Run format, lint, typecheck, unit, integration, E2E, accessibility, build, and offline/update suites.
- Verify backup/export/import compatibility with V1 records.
- Verify update recovery, dirty-form protection, direct URL Actions, storage failures, and timer resume after iOS suspension.
- Complete a migration rehearsal even when the schema is unchanged: install V1, create representative data, upgrade to V2, and verify all records.

### V2-M6 — GitHub Pages release candidate

**Status:** Blocked by V2-M5

- Review the release diff and repository cleanliness.
- Push the approved commit set to GitHub.
- Observe the GitHub Actions Pages workflow.
- Run deployed smoke, installability, deep-link, asset-path, and service-worker update checks.
- Do not tag the final release yet.

### V2-M7 — Physical-iPhone acceptance

**Status:** Blocked by V2-M6 and requires owner participation

The owner verifies on the installed Home Screen app:

- existing V1 data remains present after the update;
- cold start, offline reopen, background/foreground, and display-mode behavior;
- Today navigation and habit completion;
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
- No personal amount, title, note, habit name, backup body, or URL Action content appears in logs.
- Every primary action works with touch targets of at least 44 × 44 CSS px.
- The interface remains usable at 320 CSS px without horizontal scrolling.
- Dark appearance and reduced-motion behavior are intentional, not accidental inversions.
- Loading and failures are never represented as zero or success.
- Finance entry remains recoverable after invalid input or a write failure.
- Habit completion is reversible and persistence failures restore the prior visual state.
- Active focus sessions reconcile from persisted timestamps rather than depending on a foreground interval.
- Deployed assets and routes work under the `/LifeIndex/` GitHub Pages base path.

## Review checklist for G1

The owner should review the first design against these questions:

- Do both the light and dark themes feel suitable for daily long-term use?
- Does the MOZE/记账本-inspired hierarchy feel familiar without making LifeIndex look like a large finance system?
- Is Today ordered correctly, with habits first and finance/focus summaries secondary?
- Is the finance bottom sheet faster and clearer than the V1 form?
- Does habit completion feel satisfying without creating pressure?
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

## Change log

| Date | Change |
| --- | --- |
| 2026-09-06 | Revised M1 after owner feedback: narrowed the reference system, simplified Today and Habits, and made both themes directly reviewable. |
| 2026-09-06 | Completed the M1 self-review for primary interactions, light/dark rendering, and 44 px touch targets; G1 remains awaiting owner review. |
| 2026-09-06 | Created the V2 version plan and opened V2-M1 design review. |
