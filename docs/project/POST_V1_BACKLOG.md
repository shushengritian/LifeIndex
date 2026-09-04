# Post-V1 Follow-up Register

**Status:** Deferred; not an active implementation plan

**Date:** 2026-09-04

The owner accepted V1 with the explicit release exception in [ADR-0005](../adr/0005-v1-owner-acceptance.md). These items are not completed tests. No automatic work or scheduled monitoring is created by this register.

| ID | Remaining evidence or decision | Owner | Completion evidence |
| --- | --- | --- | --- |
| PV1-01 | iPhone model/iOS, Home Screen standalone install, all five routes, touch/safe-area behavior | User + agent guidance | User confirms checklist §3 with non-sensitive device details |
| PV1-02 | Saved Finance/Habits/Focus records and suspended Focus survive relaunch | User + agent guidance | Synthetic-only checklist §4 passes |
| PV1-03 | Airplane-mode launch/reload/read/write/relaunch | User + agent guidance | Physical checklist §5 passes; do not substitute desktop WebKit |
| PV1-04 | Files/iCloud export, preview/cancel, replacement restore, invalid-file rejection | User + agent guidance | Physical checklist §6 passes with synthetic backups |
| PV1-05 | Valid/invalid actions, deduplication and an actual iOS Shortcut | User + agent guidance | Physical checklist §7 passes |
| PV1-06 | Two-version installed update protects drafts and saved records | User + agent guidance | Physical checklist §8 passes against two recorded verified versions |
| PV1-07 | Project license choice | Repository owner | Explicit owner decision; no license is currently added |
| PV1-08 | Supplemental fresh dependency-advisory query unavailable during release | Engineering | Recheck the unchanged production dependency graph when npm's advisory endpoint is reachable, before future dependency changes; do not represent the timeout as a clean audit |

Use [IPHONE_ACCEPTANCE.md](../operations/IPHONE_ACCEPTANCE.md) for the full steps. Never upload personal records, backups, device identifiers, or action URLs to GitHub as evidence.

## Future-version intake

When the owner provides new ideas, first identify the requested outcome, affected modules, acceptance tests, and data compatibility impact. Add an ADR when the approved baseline changes, then create a version-specific plan. Do not infer approval for Journal, Writing, Timeline, Insights, accounts, a backend, cloud synchronization, or a new hosting provider.

Any new stored-field invariant, table/index change, or backup-format change requires supported-old-version fixtures, deterministic migration, rollback and conflict tests, and release/recovery documentation. Application-code rollback is not a database downgrade. No such schema change is part of `v1.0.0`.
