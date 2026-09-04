# ADR-0005: Owner-accepted V1 release with deferred physical-device checks

**Status:** Accepted by the product owner

**Date:** 2026-09-04

## Context and approval

The original release gate required a complete physical-iPhone checklist before `v1.0.0`. The owner reported that LifeIndex opens in the phone browser and considered V1 complete. The agent explicitly asked whether the owner accepted the current delivery, deferred the unfinished physical checks, and authorized final documentation, automated checks, and `v1.0.0` publication before closing the goal. The owner answered “接受”.

This is an explicit change to the release acceptance gate, not evidence that the deferred tests passed. The earlier baseline's product scope and data-safety requirements remain unchanged.

## Decision

- Accept the implemented V1 scope as the owner's first release, subject to successful final automated gates, Pages deployment, tag, and release handoff.
- Record only phone-browser opening as user-confirmed. The device model, iOS version, Home Screen installation, full navigation, persistence/suspension, airplane-mode use, Files/iCloud restore, Shortcuts, and physical update transition remain unverified.
- Track those checks in `docs/project/POST_V1_BACKLOG.md` and retain the executable checklist in `docs/operations/IPHONE_ACCEPTANCE.md`. They no longer block this owner-accepted `v1.0.0`; they must not be relabeled as verified or silently removed.
- Retain all automated quality gates and the already documented Playwright WebKit offline-reload limitation. This decision does not waive a known data-loss/privacy defect or authorize weakening tests.
- Release `1.0.0` with the same business logic, dependency graph, IndexedDB schema V1, and backup format V1 as `0.1.1`. Only application/test version metadata, verification comments, and release documentation change.
- Preserve the current repository and Pages access model. No license grant is inferred or added; the unresolved license choice is recorded as an administrative follow-up, not a reason to keep developing V1.
- Close the current delivery goal only after publication evidence and repository hygiene are verified. Do not start another goal, recurring task, or feature iteration without a new user request.

## Consequences

- `v1.0.0` means owner-accepted delivery with disclosed verification limits, not certification across iPhone models/iOS versions.
- A physical-only issue can still exist despite green Chromium/WebKit tests. Use synthetic records for the deferred checks and keep independent exported backups before relying on important records.
- Future storage changes still need explicit versioned migrations, data-integrity and rollback tests, and backup compatibility. Backup V0 conversion is not evidence of a database V1-to-V2 migration.
- Future product ideas will be scoped in a new version plan when the owner supplies them; this decision is not approval to implement additional modules now.

## Superseded acceptance statements

For this release only, this decision replaces the unconditional pre-release physical-device gate in PLAN, PRD §10, HLD §16, DEV, and the iPhone acceptance runbook. Their evidence boundaries and all functional/privacy/data requirements remain in force.
